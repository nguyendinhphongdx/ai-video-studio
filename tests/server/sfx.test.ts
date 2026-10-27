// Sound effects on a throw-away data folder: planning, synthesis, the person's own files, and the real ffmpeg mix.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { BASE_VOLUME, planCues, SFX_KINDS, type CueScene } from '@/core/audio/sfx';

const dataDir = `${process.env.TMPDIR ?? '/tmp'}/avs-sfx-test-${process.pid}`;
process.env.AVS_DATA_DIR = dataDir;

const scene = (id: string, block = 'remotion/vox'): CueScene => ({ id, block, props: {}, ordinal: 1 });

describe('planning cues', () => {
  it('puts a sweep into every cut after the first and the block\'s own sounds where the scene says', () => {
    const scenes = [scene('a'), scene('b'), scene('c')];
    const cues = planCues(scenes, [4, 5, 6], (s) => (s.id === 'b' ? [{ kind: 'stamp', at: 0.55 }] : undefined));
    expect(cues.map((c) => [c.sceneId, c.kind])).toEqual([['b', 'whoosh-soft'], ['b', 'stamp'], ['c', 'whoosh']]);
    expect(cues[0]!.atSec).toBeCloseTo(3.94, 2);
    expect(cues[1]!.atSec).toBeCloseTo(4.55, 2);
    expect(cues[2]!.atSec).toBeCloseTo(8.94, 2);
  });

  it('skips the automatic sweep when a scene opens with its own entrance sound, and thins out crowded cues', () => {
    const scenes = [scene('a'), scene('b')];
    const own = planCues(scenes, [3, 3], (s) => (s.id === 'b' ? [{ kind: 'impact', at: 0.05 }] : undefined));
    expect(own.map((c) => c.kind)).toEqual(['impact']);
    const crowded = planCues(scenes, [3, 3], (s) => (s.id === 'b' ? [{ kind: 'pop', at: 0.0 }, { kind: 'stamp', at: 0.1 }] : undefined));
    expect(crowded.filter((c) => c.sceneId === 'b').length).toBeLessThanOrEqual(2);
    expect(crowded.every((c, i) => i === 0 || c.atSec - crowded[i - 1]!.atSec >= 0.22 || c.kind === 'tick')).toBe(true);
  });

  it('scales every cue by the master level and never exceeds 1', () => {
    const cues = planCues([scene('a'), scene('b')], [3, 3], (s) => (s.id === 'b' ? [{ kind: 'impact', at: 0.05 }] : undefined), 0.5);
    expect(cues[0]!.volume).toBeCloseTo(BASE_VOLUME.impact * 0.5, 5);
    expect(Math.max(...planCues([scene('a'), scene('b')], [3, 3], () => [{ kind: 'impact', at: 0.1, volume: 5 }], 1).map((c) => c.volume))).toBeLessThanOrEqual(1);
  });
});

describe('sound files and the mix (needs ffmpeg)', () => {
  let sfx: typeof import('@/server/adapters/sfx/sfx.service');
  let video: typeof import('@/server/adapters/video/video.service');
  let prefs: typeof import('@/server/modules/prefs/prefs.service');

  beforeAll(async () => {
    fs.mkdirSync(dataDir, { recursive: true });
    sfx = await import('@/server/adapters/sfx/sfx.service');
    video = await import('@/server/adapters/video/video.service');
    prefs = await import('@/server/modules/prefs/prefs.service');
    return () => fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('makes every sound the first time it is asked for, and reuses it', async () => {
    for (const kind of SFX_KINDS) {
      const file = await sfx.sfx.file(kind, 0);
      expect(file, kind).not.toBeNull();
      expect(await video.probeDuration(file!)).toBeGreaterThan(0.04);
    }
    expect(await sfx.sfx.file('whoosh', 0)).toBe(await sfx.sfx.file('whoosh', 5));
  });

  it('prefers the person\'s own files and takes turns between them', async () => {
    const dir = path.join(dataDir, 'sfx', 'pop');
    fs.mkdirSync(dir, { recursive: true });
    const synthesised = (await sfx.sfx.file('pop', 0))!;
    fs.copyFileSync(synthesised, path.join(dir, 'a.wav'));
    fs.copyFileSync(synthesised, path.join(dir, 'b.wav'));
    expect(path.basename((await sfx.sfx.file('pop', 0))!)).toBe('a.wav');
    expect(path.basename((await sfx.sfx.file('pop', 1))!)).toBe('b.wav');
    expect(path.basename((await sfx.sfx.file('pop', 2))!)).toBe('a.wav');
  });

  it('is on by default at 80% and remembers changes', async () => {
    expect(await prefs.prefsService.sfx()).toEqual({ enabled: true, volume: 0.8 });
    await prefs.prefsService.saveSfx({ enabled: false, volume: 0.4 });
    expect(await prefs.prefsService.sfx()).toEqual({ enabled: false, volume: 0.4 });
  });

  it('remembers that the first-run guide was dismissed', () => {
    expect(prefs.prefsService.onboardingDismissed()).toBe(false);
    prefs.prefsService.setOnboardingDismissed(true);
    expect(prefs.prefsService.onboardingDismissed()).toBe(true);
  });

  it('mixes the sounds into the joined video without changing its length', async () => {
    const dir = path.join(dataDir, 'mix');
    fs.mkdirSync(dir, { recursive: true });
    const clip = (name: string) => {
      const f = path.join(dir, name);
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=320x180:d=1:r=30', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', '1', '-shortest', '-c:v', 'libx264', '-c:a', 'aac', f]);
      return f;
    };
    const clips = [clip('1.mp4'), clip('2.mp4')];
    const impact = (await sfx.sfx.file('impact', 0))!;
    const plain = path.join(dir, 'plain.mp4');
    const mixed = path.join(dir, 'mixed.mp4');
    const d0 = await video.video.concat(clips, plain, { width: 320, height: 180 });
    const d1 = await video.video.concat(clips, mixed, { width: 320, height: 180, sfx: [{ file: impact, atSec: 0.5, volume: 0.8 }, { file: impact, atSec: 1.2, volume: 0.5 }] });
    expect(d1).toBeCloseTo(d0, 1);
    // The clips are silent, so any signal in the joined audio is the sounds.
    const peak = (f: string) => Number(/max_volume: (-?[\d.]+) dB/.exec(spawnSync('ffmpeg', ['-i', f, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr)?.[1] ?? '-91');
    expect(peak(plain)).toBeLessThan(-60);
    expect(peak(mixed)).toBeGreaterThan(-20);
  });
});

describe('looking at a finished video (needs ffmpeg)', () => {
  it('finds the black hole and the silent stretch in the middle of a clip, and passes a clean one', async () => {
    const { video } = await import('@/server/adapters/video/video.service');
    const { QUALITY_CHECKS } = await import('@/core/quality/checks');
    const check = QUALITY_CHECKS.find((c) => c.id === 'av-health')!;
    const dir = path.join(dataDir, 'analyze');
    fs.mkdirSync(dir, { recursive: true });
    const bad = path.join(dir, 'bad.mp4');
    // 2s colour with a tone, 1.5s black and silent, 2s colour with a tone.
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', "color=c=white:s=160x90:d=5.5:r=15,drawbox=x=0:y=0:w=160:h=90:color=black:t=fill:enable='between(t,2,3.5)'", '-f', 'lavfi', '-i', "sine=frequency=440:duration=5.5,volume='if(between(t,2,3.5),0,0.3)':eval=frame", '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', bad]);
    const a = await video.analyze(bad);
    expect(a.black.length).toBeGreaterThanOrEqual(1);
    expect(a.black[0]!.start).toBeGreaterThan(1.8);
    expect(a.silences.length).toBeGreaterThanOrEqual(0);
    const issues = check.run({ stage: 'video', analysis: a, totalSeconds: a.durationSec } as never);
    expect(issues.some((i) => i.message.includes('đoạn đen'))).toBe(true);
    expect(check.run({ stage: 'video', analysis: { black: [], silences: [], meanDb: -18, maxDb: -3, durationSec: 10 }, totalSeconds: 10 } as never)).toEqual([]);
    expect(check.run({ stage: 'video', analysis: { black: [], silences: [{ start: 3, end: 6.5 }], meanDb: -40, maxDb: -0.1, durationSec: 10 }, totalSeconds: 10 } as never).map((i) => i.message).join('|')).toMatch(/Im lặng.*\|.*chạm trần.*\|.*quá nhỏ/);
  });

  it('parses the ffmpeg report, including a stretch still open at the end', async () => {
    const { parseAnalysis } = await import('@/server/adapters/video/video.service');
    const report = '[blackdetect @ 0x1] black_start:2.1 black_end:3.4 black_duration:1.3\n[silencedetect @ 0x2] silence_start: 8.5\n[Parsed_volumedetect_0 @ 0x3] mean_volume: -21.3 dB\n[Parsed_volumedetect_0 @ 0x3] max_volume: -2.1 dB';
    expect(parseAnalysis(report, 10)).toEqual({ black: [{ start: 2.1, end: 3.4 }], silences: [{ start: 8.5, end: 10 }], meanDb: -21.3, maxDb: -2.1, durationSec: 10 });
  });
});
