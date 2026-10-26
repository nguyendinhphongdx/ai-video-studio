import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_VOICE, type Channel } from '@/core/domain';
import { newId } from '@/core/domain/ids';
import type { ChannelStore } from '@/core/ports';
import { now } from '@/server/db';
import { ApiError, conflict, notFound } from '@/server/http/api-error';
import { SEED_DIR } from '@/server/config';
import { mediaUrl, saveChannelLogo } from '@/server/adapters/media/media.service';

import { channelRepository } from './channel.repository';
import type { ChannelInput } from './channel.types';

export interface ChannelView extends Channel {
  logoUrl: string | null;
}

const view = (c: Channel): ChannelView => ({ ...c, logoUrl: c.logoPath ? mediaUrl(c.logoPath) : null });

const LOGO_TYPES: Record<string, string> = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };
const MAX_LOGO_BYTES = 4 * 1024 * 1024;

/** First run: create the channels shipped in seed/channels/<id>/ (brand.json + logo.png). */
let seeded = false;
async function ensureSeeded() {
  if (seeded) return;
  seeded = true;
  if (channelRepository.count() > 0) return;
  const dir = path.join(SEED_DIR, 'channels');
  if (!fs.existsSync(dir)) return;
  for (const slug of fs.readdirSync(dir)) {
    const brandFile = path.join(dir, slug, 'brand.json');
    if (!fs.existsSync(brandFile)) continue;
    const b = JSON.parse(fs.readFileSync(brandFile, 'utf8'));
    const id = newId();
    const logo = path.join(dir, slug, 'logo.png');
    const ts = now();
    channelRepository.insert({
      id,
      name: b.name ?? slug,
      audience: b.audience ?? 'khán giả Việt Nam',
      style: b.style ?? 'câu ngắn, dễ hiểu, giọng thân thiện',
      voice: b.voice ?? DEFAULT_VOICE,
      outroText: b.outroText ?? 'Hẹn gặp lại nhé!',
      subscribeText: b.subscribeText ?? '🔔 ĐĂNG KÝ KÊNH',
      hashtags: b.hashtags ?? [],
      palette: b.palette ?? ['#5B3DF5', '#FFC53D', '#FF5C8A'],
      music: b.music ?? 'music.wav',
      logoPath: fs.existsSync(logo) ? await saveChannelLogo(id, fs.readFileSync(logo), '.png') : null,
      defaultSkillId: b.defaultSkillId ?? null,
      createdAt: ts,
      updatedAt: ts,
    });
  }
}

export const channelService = {
  async list(): Promise<ChannelView[]> {
    await ensureSeeded();
    return channelRepository.list().map(view);
  },

  async get(id: string): Promise<ChannelView> {
    await ensureSeeded();
    const c = channelRepository.find(id);
    if (!c) throw notFound('kênh');
    return view(c);
  },

  async create(input: ChannelInput): Promise<ChannelView> {
    const ts = now();
    const c: Channel = { id: newId(), ...input, logoPath: null, createdAt: ts, updatedAt: ts };
    channelRepository.insert(c);
    return view(c);
  },

  async update(id: string, input: ChannelInput): Promise<ChannelView> {
    const c = await channelService.get(id);
    const next: Channel = { ...c, ...input, updatedAt: now() };
    channelRepository.update(next);
    return view(next);
  },

  async setLogo(id: string, file: File): Promise<ChannelView> {
    const c = await channelService.get(id);
    const ext = LOGO_TYPES[file.type];
    if (!ext) throw new ApiError(400, 'validation_error', 'Logo phải là ảnh PNG, JPG hoặc WEBP');
    if (file.size > MAX_LOGO_BYTES) throw new ApiError(400, 'validation_error', 'Logo tối đa 4MB');
    const logoPath = await saveChannelLogo(id, Buffer.from(await file.arrayBuffer()), ext);
    const next = { ...c, logoPath, updatedAt: now() };
    channelRepository.update(next);
    return view(next);
  },

  async remove(id: string) {
    await channelService.get(id);
    if (channelRepository.projectCount(id) > 0) throw conflict('Kênh đang có video. Xoá các video của kênh trước.');
    channelRepository.remove(id);
  },
};

export const channelStore: ChannelStore = { get: (id) => channelService.get(id) };
