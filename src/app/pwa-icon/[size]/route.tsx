import { ImageResponse } from 'next/og';

/** App icon for the manifest and iOS home screen: "192", "512" or "maskable" (full-bleed, safe zone inside). */
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const maskable = size === 'maskable';
  const px = maskable ? 512 : Number(size);
  if (!maskable && ![180, 192, 512].includes(px)) return new Response('Not found', { status: 404 });
  const inner = px * (maskable ? 0.4 : 0.5);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#4f46e5', borderRadius: maskable ? 0 : px * 0.22 }}>
        <svg width={inner} height={inner} viewBox="0 0 24 24" fill="#fff">
          <path d="M7 4.5v15a1 1 0 0 0 1.52.85l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5z" />
        </svg>
      </div>
    ),
    { width: px, height: px, headers: { 'cache-control': 'public, max-age=86400' } },
  );
}
