import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { Providers } from '@/providers/providers';

import './globals.css';

const beVietnam = Be_Vietnam_Pro({ variable: '--font-be-vietnam', subsets: ['latin', 'latin-ext', 'vietnamese'], weight: ['400', '500', '600', '700', '800'], display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'AI Video Studio', template: '%s · AI Video Studio' },
  description: 'AI viết, lồng tiếng và dựng video cho kênh của bạn; bạn duyệt.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0f172a' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning className={cn('h-full', beVietnam.variable)}>
      <body className="h-full font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
