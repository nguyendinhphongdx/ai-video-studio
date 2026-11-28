// What may be attached to the assistant, and what of it reaches the model.
import { describe, expect, it } from 'vitest';

import { checkAttachment, MAX_TEXT_BYTES } from '@/core/assistant/attachments';
import { toChatMessages, withAttachments } from '@/core/assistant/loop';
import type { AssistantMessage } from '@/core/ports';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2]);

describe('checkAttachment', () => {
  it('decides the type from the bytes', () => {
    expect(checkAttachment(PNG, 'a.txt')).toEqual({ ext: '.png' });
    expect(checkAttachment(new TextEncoder().encode('xin chào'), 'a.md')).toEqual({ ext: '.md' });
    expect(checkAttachment(new TextEncoder().encode('<svg/>'), 'a.png')).toHaveProperty('error');
    expect(checkAttachment(new Uint8Array(MAX_TEXT_BYTES + 1).fill(65), 'a.txt')).toHaveProperty('error');
    expect(checkAttachment(new Uint8Array(), 'a.txt')).toHaveProperty('error');
  });
});

const user = (id: number, name: string | null): AssistantMessage => ({
  id, threadId: 't', role: 'user', content: `tin ${id}`, toolCalls: [], toolCallId: null, toolName: null, status: 'done', summary: '', focus: null, createdAt: '',
  data: name ? { attachments: [{ path: name, name, mime: name.endsWith('.png') ? 'image/png' : 'text/plain', size: 1 }] } : null,
});

describe('withAttachments', () => {
  it('re-sends only the latest three messages that had files and names the older ones', async () => {
    const messages = [user(1, 'a.png'), user(2, null), user(3, 'b.txt'), user(4, 'c.png'), user(5, 'd.png')];
    const read: string[] = [];
    const out = await withAttachments(messages, toChatMessages(messages), async (a) => (read.push(a.name), `body of ${a.name}`));
    expect(read).toEqual(['b.txt', 'c.png', 'd.png']);
    expect(out[0]!.images).toBeUndefined();
    expect(out[0]!.content).toContain('không gửi lại: a.png');
    expect(out[1]!.content).toBe('tin 2');
    expect(out[2]!.content).toContain('body of b.txt');
    expect(out[4]!.images).toEqual([{ mime: 'image/png', base64: 'body of d.png' }]);
  });
});
