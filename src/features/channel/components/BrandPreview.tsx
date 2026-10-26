'use client';

import { fallbackDesign } from '@/core/domain/design';
import { AskAiButton } from '@/features/assistant/components/AskAiButton';
import { ScenePlayer } from '@/features/episode/components/preview';
import type { SceneBrand } from '@video/primitives';

import type { ChannelInput } from '../services/channel.api';

/** Cheap change key so a player restarts when the design (or anything it draws) changes. */
const stamp = (v: unknown) => {
  const t = JSON.stringify(v) ?? '';
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return `${t.length}-${h}`;
};

/** The channel's own intro and outro, playing live with the design and values being edited. */
export function BrandPreview({ input, logoUrl, avatarUrl, introArtUrl, outroArtUrl, sampleTitle }: { input: ChannelInput; logoUrl: string | null; avatarUrl: string | null; introArtUrl: string | null; outroArtUrl: string | null; sampleTitle: string }) {
  const brand: SceneBrand = {
    name: input.name || 'Tên kênh',
    font: input.font,
    logoSrc: logoUrl,
    avatarSrc: avatarUrl,
    introDesign: input.introDesign ?? fallbackDesign('intro', input.palette),
    outroDesign: input.outroDesign ?? fallbackDesign('outro', input.palette),
    introArtSrc: introArtUrl,
    outroArtSrc: outroArtUrl,
    outroText: input.outroText,
    subscribeText: input.subscribeText,
    palette: input.palette,
  };
  const palette = input.palette.join(', ');
  const look = `Kênh: ${input.name}. Khán giả: ${input.audience}. Giọng văn: ${input.style}. Bảng màu: ${palette}. Font: ${input.font}.${input.imageStyle ? ` Phong cách ảnh: ${input.imageStyle.slice(0, 160)}.` : ''}`;
  const introPrompt = `Thiết kế lại phần MỞ ĐẦU của kênh này (đọc thiết kế hiện tại bằng get_channel designs=true rồi sửa, giữ logo và bảng màu).\n${look}\nHiện tại: ${input.introDesign ? `${input.introDesign.layers.length} lớp, ${input.introDesign.seconds} giây` : 'chưa có thiết kế riêng'}.\n\nMuốn đổi: [mô tả điều bạn muốn, ví dụ: bố cục lạ hơn, chữ lớn và đậm hơn, chuyển động nhanh hơn, hợp phong cách của kênh hơn, thêm ảnh nền AI].`;
  const outroPrompt = `Thiết kế lại phần KẾT của kênh này (đọc thiết kế hiện tại bằng get_channel designs=true rồi sửa, giữ nút đăng ký và bảng màu).\n${look}\nHiện tại: ${input.outroDesign ? `${input.outroDesign.layers.length} lớp, ${input.outroDesign.seconds} giây` : 'chưa có thiết kế riêng'}. Lời chào cuối: "${input.outroText}".\n\nMuốn đổi: [mô tả điều bạn muốn, ví dụ: ấm áp hơn, thêm lời kêu gọi theo dõi, đồng bộ với mở đầu].`;
  const cardsPrompt = `Cảnh nội dung của kênh đang dùng màu chính ${input.palette[0] ?? ''} và font ${input.font}.\n${look}\n\nMuốn đổi: [ví dụ: đổi bảng màu và font cho hợp kênh hơn, rồi cập nhật kênh].`;
  const key = stamp([input.font, input.palette, input.name, input.outroText, input.subscribeText, logoUrl, avatarUrl, introArtUrl, outroArtUrl, input.introDesign, input.outroDesign]);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-caption font-semibold text-muted-foreground">Mở đầu của kênh {input.introDesign ? '' : '· chưa thiết kế, đang dùng bản tối giản'}</span>
          <AskAiButton title="Nhờ AI làm lại mở đầu" prompt={introPrompt} />
        </div>
        <ScenePlayer key={`t-${key}`} block="remotion/title" props={{ title: sampleTitle }} ordinal={1} brand={brand} durationSec={input.introDesign?.seconds ?? 4} />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-caption font-semibold text-muted-foreground">Kết của kênh {input.outroDesign ? '' : '· chưa thiết kế, đang dùng bản tối giản'}</span>
          <AskAiButton title="Nhờ AI làm lại phần kết" prompt={outroPrompt} />
        </div>
        <ScenePlayer key={`o-${key}`} block="remotion/outro" props={{}} ordinal={1} brand={brand} durationSec={input.outroDesign?.seconds ?? 5} />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-caption font-semibold text-muted-foreground">Một cảnh nội dung · @remotion/cards (màu chính)</span>
          <AskAiButton title="Nhờ AI chỉnh cảnh nội dung" prompt={cardsPrompt} />
        </div>
        <ScenePlayer
          key={`c-${input.font}-${input.palette[0]}`}
          block="remotion/cards"
          props={{ heading: '3', emoji: '⭐', count: 3, caption: 'Ba ngôi sao', color: input.palette[0] ?? '#4F46E5' }}
          ordinal={1}
          brand={brand}
          durationSec={3.5}
        />
      </div>
    </div>
  );
}
