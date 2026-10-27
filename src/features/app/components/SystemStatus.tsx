'use client';

import { CircleAlert, TriangleAlert } from 'lucide-react';
import Link from 'next/link';

import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';

import { useAppConfig } from '../hooks/use-app';

interface Issue {
  id: string;
  level: 'error' | 'warning';
  text: string;
  action?: { href: string; label: string };
}

/**
 * What stops work from running, said once at the top of the screen with the way to fix it, instead of a failure
 * halfway through a video. Nothing is shown when everything is ready.
 */
export function SystemStatus() {
  const { data: c } = useAppConfig();
  if (!c) return null;
  const issues: Issue[] = [];
  if (!c.worker.alive) issues.push({ id: 'worker', level: 'error', text: 'Tiến trình nền (worker) chưa chạy: kịch bản, ảnh, giọng và dựng video sẽ đứng yên. Hãy chạy `npm run dev` (hoặc `npm start`) ở thư mục dự án.' });
  if (!c.ffmpeg) issues.push({ id: 'ffmpeg', level: 'error', text: 'Máy chưa có ffmpeg nên không ghép được video và âm thanh. Cài ffmpeg rồi tải lại trang.' });
  if (!c.llm.ready) issues.push({ id: 'llm', level: 'warning', text: 'Chưa kết nối AI viết kịch bản và trợ lý.', action: { href: ROUTES.settings, label: 'Mở Cài đặt' } });
  if (!c.tts && !c.ttsGoogle) issues.push({ id: 'voice', level: 'warning', text: 'Chưa có giọng đọc nào dùng được (cần edge-tts hoặc Google API key).', action: { href: ROUTES.settings, label: 'Mở Cài đặt' } });
  if (!issues.length) return null;
  return (
    <div className="mb-5 flex flex-col gap-2" role="status" aria-live="polite">
      {issues.map((i) => {
        const Icon = i.level === 'error' ? CircleAlert : TriangleAlert;
        return (
          <div key={i.id} className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-4 py-3 text-small', i.level === 'error' ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-warning/30 bg-warning-soft text-warning')}>
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">{i.text}</span>
            {i.action ? (
              <Link href={i.action.href} className="shrink-0 font-semibold underline">
                {i.action.label}
              </Link>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
