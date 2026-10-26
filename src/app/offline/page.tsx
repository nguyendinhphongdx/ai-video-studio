import { WifiOff } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Mất kết nối' };

/** Shown by the service worker when a page cannot be fetched. */
export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6 text-center">
      <div className="flex max-w-sm flex-col items-center gap-3">
        <WifiOff className="size-10 text-muted-foreground" aria-hidden />
        <h1 className="text-h2 font-extrabold">Mất kết nối</h1>
        <p className="text-small text-muted-foreground">Không kết nối được tới máy chạy AI Video Studio. Kiểm tra mạng (hoặc máy chủ còn chạy không) rồi thử lại.</p>
        <a href="/" className="mt-2 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 font-semibold text-primary-foreground">
          Thử lại
        </a>
      </div>
    </main>
  );
}
