/** The app mark: a play button split by a cut. Same geometry as public/logo.svg and the design canvas's "17 · Logo" board. */
export const BRAND_ACCENT = '#C2310F';

export function LogoMark({ size = 22, title }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <rect width="24" height="24" rx="6" fill={BRAND_ACCENT} />
      <path d="M8.5 6.8 L17.6 12 L8.5 17.2 Z" fill="#FFFFFF" />
      <path d="M13.1 5.6 L11.1 18.4" stroke={BRAND_ACCENT} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
