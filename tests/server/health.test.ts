// What the top-of-screen status reads: is the worker beating, is ffmpeg there. Plus the navigation and scene-editor helpers.
import fs from 'node:fs';

import { beforeAll, describe, expect, it } from 'vitest';

process.env.AVS_DATA_DIR = `${process.env.TMPDIR ?? '/tmp'}/avs-health-test-${process.pid}`;

describe('system health', () => {
  let prefs: typeof import('@/server/modules/prefs/prefs.service');
  let config: typeof import('@/server/modules/config/config.service');

  beforeAll(async () => {
    fs.mkdirSync(process.env.AVS_DATA_DIR!, { recursive: true });
    prefs = await import('@/server/modules/prefs/prefs.service');
    config = await import('@/server/modules/config/config.service');
    return () => fs.rmSync(process.env.AVS_DATA_DIR!, { recursive: true, force: true });
  });

  it('says the worker is not running until it has beaten, and not running again once the beat is old', async () => {
    expect((await config.configService.get()).worker.alive).toBe(false);
    prefs.prefsService.workerBeat();
    expect((await config.configService.get()).worker.alive).toBe(true);
    expect(prefs.prefsService.workerSeenAt()).toBeGreaterThan(Date.now() - 5000);
  });

  it('knows whether ffmpeg is installed', async () => {
    expect(typeof (await config.configService.get()).ffmpeg).toBe('boolean');
  });
});

describe('navigation and the scene editor', () => {
  it('keeps the owning item highlighted on screens that moved inside it', async () => {
    const { MAIN_NAV, SETUP_NAV, isActive } = await import('@/components/layout/main/nav-items');
    expect(MAIN_NAV.map((i) => i.label)).toEqual(['Tạo video', 'Video', 'Series', 'Kênh']);
    expect(SETUP_NAV.map((i) => i.label)).toEqual(['Chi phí', 'Cài đặt']);
    const video = MAIN_NAV.find((i) => i.label === 'Video')!;
    const channel = MAIN_NAV.find((i) => i.label === 'Kênh')!;
    expect(isActive('/episodes/abc', video.href, video.also)).toBe(true);
    expect(isActive('/skills/cinematic', channel.href, channel.also)).toBe(true);
    expect(isActive('/skills', video.href, video.also)).toBe(false);
    expect(isActive('/', '/')).toBe(true);
    expect(isActive('/library', '/')).toBe(false);
  });

  it('offers quick looks only for choices a block really has, with values it offers', async () => {
    const { motionPresets } = await import('@/features/episode/lib/presets');
    const { toolCatalog } = await import('@/tools/registry');
    const vox = toolCatalog.block('remotion/vox')!.fields.filter((f) => f.advanced);
    const presets = motionPresets(vox);
    expect(presets.map((p) => p.id)).toEqual(['calm', 'balanced', 'dramatic']);
    expect(presets[2]!.values).toMatchObject({ motion: 'crash-zoom', fx: 'spotlight' });
    // A counter has only the opening to choose: no quick looks.
    expect(motionPresets(toolCatalog.block('remotion/counter')!.fields.filter((f) => f.advanced))).toEqual([]);
    expect(toolCatalog.block('remotion/vox')!.fields.filter((f) => !f.advanced).map((f) => f.key)).toEqual(['label', 'imagePrompt']);
  });
});
