// Sound effects for the finished video. Every sound is synthesised with ffmpeg the first time it is needed (so no
// third-party audio ships with the app), and a person's own files win: drop .mp3/.wav files into data/sfx/<kind>/
// (for example data/sfx/whoosh/) and they are used instead, taking turns when there are several.
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { SFX_KINDS, type SfxKind, type SfxPort } from '@/core/audio/sfx';
import { DATA_DIR } from '@/server/config';
import { createLogger } from '@/server/logger';
import { prefsService } from '@/server/modules/prefs/prefs.service';

const run = promisify(execFile);
const logger = createLogger('sfx');
const SFX_DIR = path.join(DATA_DIR, 'sfx');
const SYNTH_DIR = path.join(SFX_DIR, '.synth');
const VERSION = 'v1';

/** [seconds, ffmpeg aevalsrc expression, filters]. Original sounds: noise sweeps, thuds, pings. */
const RECIPES: Record<SfxKind, [number, string, string]> = {
  whoosh: [0.9, '(random(0)*2-1)*0.9*pow(sin(PI*t/0.9),2)', 'highpass=f=250,lowpass=f=5500,alimiter=limit=0.9'],
  'whoosh-soft': [0.7, '(random(0)*2-1)*0.6*pow(sin(PI*t/0.7),2)', 'highpass=f=200,lowpass=f=3200,alimiter=limit=0.9'],
  impact: [1.4, 'sin(2*PI*(48+110*exp(-9*t))*t)*exp(-3.2*t)*0.95+(random(0)*2-1)*exp(-30*t)*0.5', 'lowpass=f=2500,aecho=0.8:0.7:90:0.3,alimiter=limit=0.95'],
  riser: [2.4, '(random(0)*2-1)*pow(t/2.4,2.2)*0.8+sin(2*PI*(220*t+700*t*t))*pow(t/2.4,2)*0.25', 'highpass=f=300,afade=t=out:st=2.3:d=0.1,alimiter=limit=0.9'],
  pop: [0.18, 'sin(2*PI*(900-3500*t)*t)*exp(-28*t)*0.9', 'alimiter=limit=0.9'],
  stamp: [0.7, 'sin(2*PI*(70+80*exp(-14*t))*t)*exp(-9*t)+(random(0)*2-1)*exp(-80*t)*0.6', 'lowpass=f=3000,alimiter=limit=0.95'],
  tick: [0.06, '(random(0)*2-1)*exp(-120*t)*0.7', 'highpass=f=1500,alimiter=limit=0.9'],
  sparkle: [1.2, 'sin(2*PI*2400*t)*exp(-9*t)*0.5+gt(t,0.12)*sin(2*PI*3200*(t-0.12))*exp(-9*(t-0.12))*0.4+gt(t,0.26)*sin(2*PI*4100*(t-0.26))*exp(-9*(t-0.26))*0.3', 'alimiter=limit=0.9'],
  paper: [0.45, '(random(0)*2-1)*sin(PI*t/0.45)*0.6', 'highpass=f=1800,lowpass=f=7000,alimiter=limit=0.9'],
};

async function synthesize(kind: SfxKind): Promise<string | null> {
  const out = path.join(SYNTH_DIR, `${kind}.${VERSION}.wav`);
  try {
    await fs.access(out);
    return out;
  } catch {
    /* not made yet */
  }
  const [dur, expr, filters] = RECIPES[kind];
  try {
    await fs.mkdir(SYNTH_DIR, { recursive: true });
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', `aevalsrc='${expr}':d=${dur}:s=44100:c=stereo`, '-af', filters, out]);
    return out;
  } catch (e) {
    logger.warn(`could not synthesise ${kind}`, { error: String((e as Error)?.message ?? e).split('\n')[0] });
    return null;
  }
}

/** The person's own files for a sound, in a stable order. */
async function ownFiles(kind: SfxKind): Promise<string[]> {
  try {
    const dir = path.join(SFX_DIR, kind);
    return (await fs.readdir(dir)).filter((f) => /\.(mp3|wav|m4a|ogg)$/i.test(f)).sort().map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

export const sfx: SfxPort = {
  enabled: () => prefsService.sfxEnabled(),
  volume: () => prefsService.sfxVolume(),
  async file(kind, variant) {
    const own = await ownFiles(kind);
    if (own.length) return own[Math.abs(variant) % own.length]!;
    return synthesize(kind);
  },
};

export const SFX_FOLDERS = SFX_KINDS.map((k) => path.join('data', 'sfx', k));
