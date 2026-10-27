// ffmpeg helpers: probe durations and join scene clips (different tools may encode differently,
// so everything is normalised to one size, frame rate and audio layout before concatenation).
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { FPS } from '@/core/domain/catalog';
import type { VideoAnalysis, VideoPort } from '@/core/ports';

const run = promisify(execFile);

export async function probeDuration(file: string): Promise<number> {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]);
  return Number(stdout.trim()) || 0;
}

async function hasAudio(file: string): Promise<boolean> {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', file]);
  return stdout.trim().length > 0;
}

/** Reads ffmpeg's blackdetect / silencedetect / volumedetect report (it goes to stderr). */
export function parseAnalysis(stderr: string, durationSec: number): VideoAnalysis {
  const values = (re: RegExp) => [...stderr.matchAll(re)].map((m) => Number(m[1]));
  const spans = (startRe: RegExp, endRe: RegExp) => {
    const ends = values(endRe);
    // A stretch still going when the file ends has a start but no end.
    return values(startRe).map((start, i) => ({ start, end: ends[i] ?? durationSec }));
  };
  const one = (re: RegExp) => {
    const m = re.exec(stderr);
    return m ? Number(m[1]) : null;
  };
  return {
    black: spans(/black_start:(-?[\d.]+)/g, /black_end:(-?[\d.]+)/g),
    silences: spans(/silence_start: (-?[\d.]+)/g, /silence_end: (-?[\d.]+)/g),
    meanDb: one(/mean_volume: (-?[\d.]+) dB/),
    maxDb: one(/max_volume: (-?[\d.]+) dB/),
    durationSec,
  };
}

export const video: VideoPort = {
  async analyze(file) {
    const durationSec = await probeDuration(file);
    const r = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-vf', 'blackdetect=d=0.4:pic_th=0.98', '-af', 'silencedetect=noise=-50dB:d=2.5,volumedetect', '-f', 'null', '-'], { maxBuffer: 1 << 24 }).catch((e: { stderr?: string }) => ({ stderr: e.stderr ?? '' }));
    return parseAnalysis(r.stderr, durationSec);
  },
  async frame(videoFile, atSec, outFile) {
    await fs.mkdir(path.dirname(outFile), { recursive: true });
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', atSec.toFixed(2), '-i', videoFile, '-frames:v', '1', '-q:v', '3', outFile]);
  },
  async concat(clips, outFile, { width, height, music, sfx }) {
    if (!clips.length) throw new Error('No clips to join');
    await fs.mkdir(path.dirname(outFile), { recursive: true });
    const args: string[] = ['-y', '-loglevel', 'error'];
    const filters: string[] = [];
    let input = 0;
    const pairs: string[] = [];
    for (const [i, clip] of clips.entries()) {
      args.push('-i', clip);
      const v = input++;
      let a = `${v}:a`;
      if (!(await hasAudio(clip))) {
        args.push('-f', 'lavfi', '-t', String(await probeDuration(clip)), '-i', 'anullsrc=r=48000:cl=stereo');
        a = `${input++}:a`;
      }
      filters.push(`[${v}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,fps=${FPS},format=yuv420p,setsar=1[v${i}]`);
      filters.push(`[${a}]aresample=48000,aformat=channel_layouts=stereo[a${i}]`);
      pairs.push(`[v${i}][a${i}]`);
    }
    filters.push(`${pairs.join('')}concat=n=${clips.length}:v=1:a=1[vout][voice]`);
    let audioOut = '[voice]';
    if (music) {
      args.push('-stream_loop', '-1', '-i', music.file);
      filters.push(`[${input}:a]volume=${music.volume},aresample=48000,aformat=channel_layouts=stereo[bed]`);
      filters.push(`[voice][bed]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[aout]`);
      audioOut = '[aout]';
      input++;
    }
    if (sfx?.length) {
      // One input per sound, delayed to its moment and mixed on top without lowering the voice or the music.
      const labels: string[] = [];
      for (const [i, cue] of sfx.entries()) {
        args.push('-i', cue.file);
        const ms = Math.round(cue.atSec * 1000);
        filters.push(`[${input}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${cue.volume.toFixed(3)},adelay=${ms}|${ms}[fx${i}]`);
        labels.push(`[fx${i}]`);
        input++;
      }
      filters.push(`${audioOut}${labels.join('')}amix=inputs=${labels.length + 1}:duration=first:dropout_transition=0:normalize=0[mixed]`);
      audioOut = '[mixed]';
    }
    args.push('-filter_complex', filters.join(';'), '-map', '[vout]', '-map', audioOut);
    args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', outFile);
    await run('ffmpeg', args, { maxBuffer: 1 << 24 });
    return probeDuration(outFile);
  },
};
