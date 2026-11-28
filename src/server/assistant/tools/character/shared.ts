import { z } from 'zod';

import type { ToolContext } from '@/core/assistant/tool';
import { POSE_ID } from '@/core/character/expressions';

import { ownSeries } from '../util';

export const Id = z.string().regex(POSE_ID).describe('Id nhân vật hoặc đạo cụ: chữ thường không dấu, số, gạch ngang, ví dụ "ly-tinh"');
export const SeriesId = z.string().describe('Id series (list_series)');

/** The character bible of a series of this project. */
export const bibleOf = async (ctx: ToolContext, seriesId: string) => (await ownSeries(ctx, seriesId)).rules.bible;
