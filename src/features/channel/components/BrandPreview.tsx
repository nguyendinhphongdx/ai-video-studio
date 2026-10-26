'use client';

import type { ChannelInput } from '../services/channel.api';

import { ScenePlayer } from '@/features/episode/components/preview';
import type { SceneBrand } from '@video/primitives';

/** The channel's intro and outro blocks, playing live with the values being edited. */
export function BrandPreview({ input, logoUrl, sampleTitle }: { input: ChannelInput; logoUrl: string | null; sampleTitle: string }) {
  const brand: SceneBrand = { name: input.name || 'Tên kênh', font: input.font, logoSrc: logoUrl, outroText: input.outroText, subscribeText: input.subscribeText, palette: input.palette };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-caption font-semibold text-muted-foreground">Cảnh mở đầu · @remotion/title</span>
        <ScenePlayer key={`t-${input.font}-${logoUrl}`} block="remotion/title" props={{ title: sampleTitle, look: 'sky' }} ordinal={1} brand={brand} durationSec={3.5} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-caption font-semibold text-muted-foreground">Cảnh kết · @remotion/outro</span>
        <ScenePlayer key={`o-${input.font}-${logoUrl}`} block="remotion/outro" props={{ look: 'sky' }} ordinal={1} brand={brand} durationSec={4} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-caption font-semibold text-muted-foreground">Một cảnh nội dung · @remotion/cards (màu chính)</span>
        <ScenePlayer
          key={`c-${input.font}`}
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
