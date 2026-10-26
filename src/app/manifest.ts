import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AI Video Studio',
    short_name: 'Video Studio',
    description: 'AI viết, lồng tiếng và dựng video cho kênh của bạn; bạn duyệt.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    lang: 'vi',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    icons: [
      { src: '/pwa-icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon/maskable', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Cần duyệt', url: '/review' },
      { name: 'Series', url: '/series' },
    ],
  };
}
