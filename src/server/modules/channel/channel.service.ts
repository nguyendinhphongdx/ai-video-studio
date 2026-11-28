import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { DEFAULT_IMAGE_STYLE, DEFAULT_VOICE, MEDIA_MUSIC_PREFIX, UserFacingError, type Channel, type Job } from '@/core/domain';
import { toMark } from '@/server/adapters/media/chroma-key';
import { storage } from '@/server/adapters/media/storage';
import { images } from '@/server/adapters/image/image.service';
import { jobRepository } from '@/server/modules/job/job.repository';
import { knowledgeRepository } from '@/server/modules/knowledge/knowledge.repository';
import { newId } from '@/core/domain/ids';
import type { ChannelStore } from '@/core/ports';
import { now } from '@/server/db';
import { ApiError, conflict, notFound } from '@/server/http/api-error';
import { SEED_DIR } from '@/server/config';
import { ctx } from '@/server/context';
import { prefsService } from '@/server/modules/prefs/prefs.service';
import { media, mediaUrl, removeChannelMedia, removeLogoDraft, saveChannelFile } from '@/server/adapters/media/media.service';

import { seriesRepository } from '@/server/modules/series/series.repository';

import { channelRepository } from './channel.repository';
import type { ChannelInput } from './channel.types';

export interface ChannelView extends Channel {
  logoUrl: string | null;
  avatarUrl: string | null;
  introArtUrl: string | null;
  outroArtUrl: string | null;
}

const view = (c: Channel): ChannelView => ({ ...c, logoUrl: c.logoPath ? mediaUrl(c.logoPath) : null, avatarUrl: c.avatarPath ? mediaUrl(c.avatarPath) : null, introArtUrl: c.introArtPath ? mediaUrl(c.introArtPath) : null, outroArtUrl: c.outroArtPath ? mediaUrl(c.outroArtPath) : null });

export interface LogoDraft {
  drawing: boolean;
  url: string | null;
  error: string | null;
}

// A video model letters Vietnamese badly, so a logo is a mark only; the project name is set in type by the templates.
const logoPrompt = (subject: string, style: string) =>
  `A logo emblem: ${subject}. One compact, bold, simple mark, centred, readable at small size. Style: ${style}. No text, no letters, no numbers. Paint it on a perfectly flat, solid pure green (#00FF00) background that fills the whole frame, no shadow, no gradient. Do not use green anywhere on the mark.`;

/** The draft of the latest finished drawing, while it has not been taken or thrown away. */
async function draftFile(id: string, job: Job | null): Promise<string | null> {
  const rel = job?.state === 'done' ? (job.result as { path?: string } | null)?.path : null;
  if (!rel) return null;
  await storage.pull(`channels/${id}/logo-draft/`);
  return (await media.exists(media.absolute(rel))) ? rel : null;
}

const LOGO_TYPES: Record<string, string> = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };
const MAX_LOGO_BYTES = 4 * 1024 * 1024;
const MUSIC_TYPES: Record<string, string> = { 'audio/mpeg': '.mp3', 'audio/mp3': '.mp3', 'audio/wav': '.wav', 'audio/x-wav': '.wav' };
const MAX_MUSIC_BYTES = 20 * 1024 * 1024;

/**
 * First run: create the channels shipped in seed/channels/<id>/ (brand.json + logo.png), once, in the system admin's
 * workspace only. Workspaces of people who sign up later start empty.
 */
async function ensureSeeded() {
  if (!ctx().user.isAdmin || await prefsService.flag('seeded')) return;
  await prefsService.setFlag('seeded');
  if (await channelRepository.count() > 0) return;
  const dir = path.join(SEED_DIR, 'channels');
  if (!fs.existsSync(dir)) return;
  for (const slug of fs.readdirSync(dir)) {
    const brandFile = path.join(dir, slug, 'brand.json');
    if (!fs.existsSync(brandFile)) continue;
    const b = JSON.parse(fs.readFileSync(brandFile, 'utf8'));
    const id = newId();
    const logo = path.join(dir, slug, 'logo.png');
    const ts = now();
    await channelRepository.insert({
      id,
      name: b.name ?? slug,
      description: b.description ?? '',
      font: b.font ?? 'Baloo2',
      audience: b.audience ?? 'khán giả Việt Nam',
      style: b.style ?? 'câu ngắn, dễ hiểu, giọng thân thiện',
      voice: b.voice ?? DEFAULT_VOICE,
      outroText: b.outroText ?? 'Hẹn gặp lại nhé!',
      subscribeText: b.subscribeText ?? '🔔 ĐĂNG KÝ KÊNH',
      hashtags: b.hashtags ?? [],
      palette: b.palette ?? ['#5B3DF5', '#FFC53D', '#FF5C8A'],
      music: b.music ?? 'music.wav',
      logoPath: fs.existsSync(logo) ? await saveChannelFile(id, 'logo', fs.readFileSync(logo), '.png') : null,
      defaultSkillId: b.defaultSkillId ?? null,
      imageStyle: b.imageStyle ?? '',
      introDesign: null,
      outroDesign: null,
      introArtPath: null,
      outroArtPath: null,
      avatarPath: null,
      createdAt: ts,
      updatedAt: ts,
    });
  }
}

export const channelService = {
  async list(): Promise<ChannelView[]> {
    await ensureSeeded();
    return (await channelRepository.list()).map(view);
  },

  async get(id: string): Promise<ChannelView> {
    await ensureSeeded();
    const c = await channelRepository.find(id);
    if (!c) throw notFound('kênh');
    return view(c);
  },

  async create(input: ChannelInput): Promise<ChannelView> {
    const ts = now();
    const c: Channel = { id: newId(), ...input, logoPath: null, avatarPath: null, introArtPath: null, outroArtPath: null, createdAt: ts, updatedAt: ts };
    await channelRepository.insert(c);
    return view(c);
  },

  async update(id: string, input: ChannelInput): Promise<ChannelView> {
    const c = await channelService.get(id);
    const next: Channel = { ...c, ...input, updatedAt: now() };
    await channelRepository.update(next);
    return view(next);
  },

  async setLogo(id: string, file: File): Promise<ChannelView> {
    const c = await channelService.get(id);
    const ext = LOGO_TYPES[file.type];
    if (!ext) throw new ApiError(400, 'validation_error', 'Logo phải là ảnh PNG, JPG hoặc WEBP');
    if (file.size > MAX_LOGO_BYTES) throw new ApiError(400, 'validation_error', 'Logo tối đa 4MB');
    const logoPath = await saveChannelFile(id, 'logo', Buffer.from(await file.arrayBuffer()), ext);
    const next = { ...c, logoPath, updatedAt: now() };
    await channelRepository.update(next);
    return view(next);
  },

  async setAvatar(id: string, file: File): Promise<ChannelView> {
    const c = await channelService.get(id);
    const ext = LOGO_TYPES[file.type];
    if (!ext) throw new ApiError(400, 'validation_error', 'Avatar phải là ảnh PNG, JPG hoặc WEBP');
    if (file.size > MAX_LOGO_BYTES) throw new ApiError(400, 'validation_error', 'Avatar tối đa 4MB');
    const avatarPath = await saveChannelFile(id, 'avatar', Buffer.from(await file.arrayBuffer()), ext);
    const next = { ...c, avatarPath, updatedAt: now() };
    await channelRepository.update(next);
    return view(next);
  },

  async removeAvatar(id: string): Promise<ChannelView> {
    const c = await channelService.get(id);
    const next = { ...c, avatarPath: null, updatedAt: now() };
    await channelRepository.update(next);
    return view(next);
  },

  async setMusic(id: string, file: File): Promise<ChannelView> {
    const c = await channelService.get(id);
    const ext = MUSIC_TYPES[file.type] ?? (/\.(mp3|wav)$/i.exec(file.name)?.[0].toLowerCase() as string | undefined);
    if (!ext) throw new ApiError(400, 'validation_error', 'Nhạc nền phải là file MP3 hoặc WAV');
    if (file.size > MAX_MUSIC_BYTES) throw new ApiError(400, 'validation_error', 'Nhạc nền tối đa 20MB');
    const rel = await saveChannelFile(id, 'music', Buffer.from(await file.arrayBuffer()), ext);
    const next = { ...c, music: `${MEDIA_MUSIC_PREFIX}${rel.split(path.sep).join('/')}`, updatedAt: now() };
    await channelRepository.update(next);
    return view(next);
  },

  /** Queues AI background art for the channel's intro or outro; the worker saves the picture on the channel. */
  async requestArt(id: string, kind: 'intro' | 'outro', prompt: string): Promise<Job> {
    const c = await channelService.get(id);
    if (!(prompt.trim() || (kind === 'intro' ? c.introDesign : c.outroDesign)?.artPrompt)) throw new UserFacingError('Chưa có mô tả ảnh nền. Nhờ AI thiết kế hoặc gõ mô tả (tiếng Anh) rồi thử lại.');
    if (!(await images.isReady())) throw new UserFacingError('Chưa cài đặt tạo ảnh AI. Mở Cài đặt, nhập Google API key ở mục Tạo ảnh AI.');
    return await jobRepository.insert(null, 'generate_art', { channelId: id, kind, prompt });
  },

  /** Runs in the worker: one picture in the channel's image style, saved as the channel's intro or outro art. */
  async generateArt(id: string, kind: 'intro' | 'outro', prompt: string): Promise<ChannelView> {
    const c = await channelService.get(id);
    const subject = prompt.trim() || (kind === 'intro' ? c.introDesign : c.outroDesign)?.artPrompt || '';
    const tmp = path.join(os.tmpdir(), `avs-art-${id}-${Date.now()}.png`);
    try {
      await images.generate(`${subject}. ${c.imageStyle.trim() || DEFAULT_IMAGE_STYLE}`, tmp, { purpose: 'channel_art' });
      const artPath = await saveChannelFile(id, `${kind}-art`, await fs.promises.readFile(tmp), '.png');
      const next = { ...c, ...(kind === 'intro' ? { introArtPath: artPath } : { outroArtPath: artPath }), updatedAt: now() };
      await channelRepository.update(next);
      return view(next);
    } finally {
      await fs.promises.rm(tmp, { force: true });
    }
  },

  /** Queues one AI logo draft. The project's logo changes only when the person takes the draft (useLogoDraft). */
  async requestLogo(id: string, prompt: string): Promise<Job> {
    await channelService.get(id);
    if (!(await images.isReady())) throw new UserFacingError('Chưa cài đặt tạo ảnh AI. Mở Cài đặt, nhập Google API key ở mục Tạo ảnh AI.');
    const last = await jobRepository.latestLogo(id);
    if (last && (last.state === 'queued' || last.state === 'running')) throw new UserFacingError('Đang vẽ logo rồi. Đợi xong hãy vẽ lại.');
    return await jobRepository.insert(null, 'generate_art', { channelId: id, kind: 'logo', prompt });
  },

  /** Runs in the worker. The description given, else the idea written when the project was set up, else the name. */
  async generateLogo(id: string, prompt: string): Promise<{ path: string }> {
    const c = await channelService.get(id);
    const rules = await Promise.all((await seriesRepository.list(id)).map((s) => seriesRepository.version(s.id, s.currentVersion)));
    const idea = rules.map((r) => r?.bible.brandIdeas?.logo?.trim()).find(Boolean);
    const subject = prompt.trim() || idea || `an emblem for a video channel called "${c.name}". ${c.description}`;
    const tmp = path.join(os.tmpdir(), `avs-logo-${id}-${Date.now()}.png`);
    try {
      await images.generate(logoPrompt(subject, c.imageStyle.trim() || DEFAULT_IMAGE_STYLE), tmp, { purpose: 'channel_art' });
      return { path: await saveChannelFile(id, 'logo-draft', await toMark(await fs.promises.readFile(tmp)), '.png') };
    } finally {
      await fs.promises.rm(tmp, { force: true });
    }
  },

  async logoDraft(id: string): Promise<LogoDraft> {
    await channelService.get(id);
    const job = await jobRepository.latestLogo(id);
    const drawing = job?.state === 'queued' || job?.state === 'running';
    const rel = await draftFile(id, job);
    return { drawing, url: rel ? mediaUrl(rel) : null, error: job?.state === 'failed' ? (job.error ?? 'Vẽ logo không xong. Thử lại.') : null };
  },

  async useLogoDraft(id: string): Promise<ChannelView> {
    const c = await channelService.get(id);
    const rel = await draftFile(id, await jobRepository.latestLogo(id));
    if (!rel) throw new UserFacingError('Không còn bản nháp logo. Vẽ lại một bản mới.');
    const logoPath = await saveChannelFile(id, 'logo', await fs.promises.readFile(media.absolute(rel)), '.png');
    const next = { ...c, logoPath, updatedAt: now() };
    await channelRepository.update(next);
    await removeLogoDraft(id);
    return view(next);
  },

  async discardLogoDraft(id: string): Promise<void> {
    await channelService.get(id);
    await removeLogoDraft(id);
  },

  async removeArt(id: string, kind: 'intro' | 'outro'): Promise<ChannelView> {
    const c = await channelService.get(id);
    const next = { ...c, ...(kind === 'intro' ? { introArtPath: null } : { outroArtPath: null }), updatedAt: now() };
    await channelRepository.update(next);
    return view(next);
  },

  async remove(id: string) {
    await channelService.get(id);
    if (await channelRepository.projectCount(id) > 0) throw conflict('Kênh đang có video. Xoá các video của kênh trước.');
    await channelRepository.remove(id);
    await removeChannelMedia(id);
  },
};

export const channelStore: ChannelStore = {
  get: async (id) => await channelService.get(id),
  async knowledge(channelId) {
    const k = await knowledgeRepository.latest(channelId);
    return k ? { version: k.version, markdown: k.markdown } : null;
  },
};
