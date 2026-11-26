import { ImageResponse } from 'next/og';

import { BRAND_ACCENT } from '@/components/brand/LogoMark';

/** App icon for the manifest and iOS home screen: "192", "512" or "maskable" (full-bleed, safe zone inside). */
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const maskable = size === 'maskable';
  const px = maskable ? 512 : Number(size);
  if (!maskable && ![180, 192, 512].includes(px)) return new Response('Not found', { status: 404 });
  const inner = px * (maskable ? 0.5 : 0.62);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BRAND_ACCENT, borderRadius: maskable ? 0 : px * 0.22 }}>
        {/* The logo mark: play split by a cut (see components/brand/LogoMark). */}
        <svg width={inner} height={inner} viewBox="0 0 24 24">
          <path d="M7.5 5.5 L19 12 L7.5 18.5 Z" fill="#fff" />
          <path d="M13.6 4 L11.1 20" stroke={BRAND_ACCENT} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { width: px, height: px, headers: { 'cache-control': 'public, max-age=86400' } },
  );
}
