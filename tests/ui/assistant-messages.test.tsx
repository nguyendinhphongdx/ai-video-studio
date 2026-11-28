import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { AssistantMessage } from '@/core/ports';
import { AssistantMessages } from '@/features/assistant/components/AssistantMessages';
import { Markdown } from '@/features/assistant/components/Markdown';

const msg = (over: Partial<AssistantMessage>): AssistantMessage => ({ id: 1, threadId: 't', role: 'user', content: '', toolCalls: [], toolCallId: null, toolName: null, status: 'done', summary: '', data: null, focus: null, createdAt: '', ...over });

describe('assistant chat rendering', () => {
  it('shows user and assistant text, with light Markdown', () => {
    const html = renderToStaticMarkup(
      <AssistantMessages
        running={false}
        deciding={false}
        onDecide={() => {}}
        messages={[msg({ id: 1, content: 'Tạo video về chợ nổi' }), msg({ id: 2, role: 'assistant', content: 'Đã tạo **video mới**:\n\n- cảnh 1\n- cảnh 2\n\nDùng `write_script` để viết.' })]}
      />,
    );
    expect(html).toContain('Tạo video về chợ nổi');
    expect(html).toMatch(/data-streamdown="strong">video mới</);
    expect(html).toContain('<ul');
    expect(html).toMatch(/<li[^>]*>cảnh 2<\/li>/);
    expect(html).toContain('<code');
  });

  it('shows each tool call by status, with approve and reject only while it waits', () => {
    const html = renderToStaticMarkup(
      <AssistantMessages
        running
        deciding={false}
        onDecide={() => {}}
        messages={[
          msg({ id: 1, role: 'tool', toolName: 'update_channel', status: 'done', summary: 'Sửa kênh: palette', content: 'Đã sửa kênh' }),
          msg({ id: 2, role: 'tool', toolName: 'generate_scene_assets', status: 'awaiting', summary: 'Tạo ảnh và giọng cho 3 cảnh', data: { risk: 'paid', args: {} } }),
          msg({ id: 3, role: 'tool', toolName: 'delete_skill', status: 'error', summary: 'Xoá skill', content: 'Skill đang được dùng' }),
          msg({ id: 4, role: 'tool', toolName: 'produce_video', status: 'rejected', summary: 'Sản xuất video' }),
        ]}
      />,
    );
    expect(html).toContain('Sửa kênh: palette');
    expect(html).toContain('Tạo ảnh và giọng cho 3 cảnh');
    expect(html).toContain('Tốn tiền hoặc chạy lâu');
    expect(html.match(/Đồng ý/g)).toHaveLength(1);
    expect(html.match(/Từ chối/g)).toHaveLength(1);
    expect(html).toContain('Skill đang được dùng');
    expect(html).toContain('Bạn đã từ chối');
    expect(html).toContain('Trợ lý đang làm');
  });

  it('hides assistant messages that only carried tool calls', () => {
    const html = renderToStaticMarkup(<AssistantMessages running={false} deciding={false} onDecide={() => {}} messages={[msg({ role: 'assistant', content: '', toolCalls: [{ id: 'c', name: 'a', args: {} }] })]} />);
    expect(html).not.toContain('rounded-bl-md');
  });

  it('shows the running turn as it is written, without repeating what is already stored', () => {
    const live = {
      runId: 'r',
      ended: null,
      items: [
        { kind: 'text' as const, id: 'old', text: 'đã lưu rồi' },
        { kind: 'reasoning' as const, id: 'new', text: 'đang cân nhắc' },
        { kind: 'text' as const, id: 'new', text: 'Câu đang viết' },
        { kind: 'tool' as const, id: 'c9', text: 'Đọc kênh', name: 'get_channel', state: 'running' as const },
      ],
    };
    const html = renderToStaticMarkup(<AssistantMessages running live={live} deciding={false} onDecide={() => {}} messages={[msg({ id: 1, role: 'assistant', content: 'Bản đã lưu', data: { liveId: 'old', reasoning: 'nghĩ trước', stopped: true } })]} />);
    expect(html).not.toContain('đã lưu rồi');
    expect(html).toContain('Câu đang viết');
    expect(html).toContain('Đọc kênh');
    expect(html).toContain('Đang chạy');
    expect(html).toContain('Suy nghĩ');
    expect(html).toContain('Đã dừng');
    expect(html).not.toContain('Trợ lý đang làm');
  });

  it('renders headings, ordered lists and tables as Markdown', () => {
    const html = renderToStaticMarkup(<Markdown text={'## Kế hoạch\n\n1. đầu\n2. sau\n\n| Tập | Tên |\n| --- | --- |\n| 1 | Mở đầu |'} />);
    expect(html).toContain('<h2');
    expect(html).toContain('<ol');
    expect(html).toContain('Mở đầu');
    expect(html).toContain('<table');
  });
});
