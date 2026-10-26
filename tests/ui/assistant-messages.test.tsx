import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { AssistantMessage } from '@/core/ports';
import { AssistantMessages } from '@/features/assistant/components/AssistantMessages';
import { RichText } from '@/features/assistant/components/RichText';

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
    expect(html).toContain('<b>video mới</b>');
    expect(html).toContain('<ul');
    expect(html).toContain('<li>cảnh 2</li>');
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

  it('renders plain paragraphs and ordered lists', () => {
    const html = renderToStaticMarkup(<RichText text={'Một dòng\nhai dòng\n\n1. đầu\n2. sau'} />);
    expect(html).toContain('<br/>');
    expect(html).toContain('hai dòng');
    expect(html).toContain('<ol');
  });
});
