import { z } from 'zod';
import { describe, expect, it } from 'vitest';

import type { AiRun } from '@/core/agent/runner';
import { runTask } from '@/core/agent/runner';
import { defineTask } from '@/core/agent/task';
import { compileContext, type ContextLayer } from '@/core/context/layer';
import { CONTEXT_LAYERS } from '@/core/context/providers';
import { UserFacingError } from '@/core/domain';

import { context } from '../fixtures';

describe('context compiler', () => {
  it('assembles every layer in order for a series episode', () => {
    const ctx = context({ memory: { season: null, recent: [{ episodeId: 'e0', seriesId: 's1', number: 2, title: 'Hai bàn tay', summary: 'Dạy số 2', concepts: ['số 2'], examples: ['bàn tay'], vocabulary: [], jokes: [], createdAt: '' }] } });
    const compiled = compileContext(CONTEXT_LAYERS, ctx);
    expect(compiled.sections.map((s) => s.id)).toEqual(['system', 'channel', 'instructions', 'skill', 'style', 'format', 'memory', 'episode']);
    expect(compiled.text).toContain('Câu bắt buộc phải có trong mỗi tập: "Gà Bông đây"');
    expect(compiled.text).toContain('Ví dụ đã dùng (không lặp lại): bàn tay');
    expect(compiled.text).toContain('Tập sau: Số 4');
    expect(compiled.text).toContain('@remotion/whiteboard');
  });

  it('drops series layers for one-off videos and respects a task layer filter', () => {
    const compiled = compileContext(CONTEXT_LAYERS, context({ series: null }), ['system', 'instructions', 'memory', 'episode']);
    expect(compiled.sections.map((s) => s.id)).toEqual(['system', 'episode']);
  });

  it('truncates a layer that exceeds its budget', () => {
    const big: ContextLayer = { id: 'memory', title: 'M', order: 1, maxChars: 10, render: () => 'x'.repeat(50) };
    expect(compileContext([big], context()).sections[0]).toMatchObject({ truncated: true });
  });
});

describe('agent runner', () => {
  const task = defineTask<{ q: string }, { a: string }>({
    id: 'echo', version: 3, layers: ['system'],
    schema: () => z.object({ a: z.string() }),
    prompt: ({ q }) => q,
    parse: (raw) => z.object({ a: z.string() }).parse(raw),
  });

  it('records a successful run with the context it used', async () => {
    const runs: AiRun[] = [];
    const out = await runTask({ llm: { isReady: async () => true, generateObject: async () => ({ object: { a: 'ok' }, model: 'm1' }) }, runs: { record: async (r) => void runs.push(r) }, layers: CONTEXT_LAYERS }, task, { q: 'hi' }, context());
    expect(out).toEqual({ a: 'ok' });
    expect(runs[0]).toMatchObject({ task: 'echo', taskVersion: 3, model: 'm1', prompt: 'hi', error: null, episodeId: 'e1', seriesId: 's1' });
    expect(runs[0]!.sections.map((s) => s.id)).toEqual(['system']);
  });

  it('records failures and turns invalid output into a short user-facing error', async () => {
    const runs: AiRun[] = [];
    const call = runTask({ llm: { isReady: async () => true, generateObject: async () => ({ object: { b: 1 }, model: 'm1' }) }, runs: { record: async (r) => void runs.push(r) }, layers: CONTEXT_LAYERS }, task, { q: 'hi' }, context());
    await expect(call).rejects.toBeInstanceOf(UserFacingError);
    expect(runs[0]?.error).toBeTruthy();
  });
});
