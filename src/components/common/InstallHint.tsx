'use client';

import { useEffect, useState } from 'react';

/** Chrome's own install event; not in the DOM typings. */
type InstallEvent = Event & { prompt: () => Promise<void> };

const DISMISSED = 'avs-install-dismissed';

/**
 * "Put the studio on your home screen", once, on touch devices that have not installed it. Android/Chrome offers a
 * real install button; iOS has no such API, so it gets the two taps to do by hand.
 */
export function InstallHint() {
  const [ask, setAsk] = useState<InstallEvent | 'ios' | null>(null);

  useEffect(() => {
    const installed = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISSED) === '1';
    } catch {
      // Private windows may refuse storage; the hint then shows again next time.
    }
    if (installed || dismissed || !window.matchMedia('(pointer: coarse), (max-width: 900px)').matches) return;
    const offer = (e: Event) => {
      e.preventDefault();
      setAsk(e as InstallEvent);
    };
    window.addEventListener('beforeinstallprompt', offer);
    // iPadOS calls itself a Mac; touch points give it away.
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
    const later = ios ? setTimeout(() => setAsk('ios'), 1500) : undefined;
    return () => {
      window.removeEventListener('beforeinstallprompt', offer);
      clearTimeout(later);
    };
  }, []);

  if (!ask) return null;
  const close = () => {
    setAsk(null);
    try {
      localStorage.setItem(DISMISSED, '1');
    } catch {
      // See above.
    }
  };
  return (
    <div role="dialog" aria-label="Cài ứng dụng" className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[80] flex items-center gap-3 rounded-xl bg-slate-900 p-3 text-sm text-white shadow-2xl">
      <p className="min-w-0 flex-1">
        {ask === 'ios' ? 'Cài vào màn hình chính: bấm nút Chia sẻ của trình duyệt, rồi chọn “Thêm vào MH chính”.' : 'Cài Video Studio vào màn hình chính để mở như một ứng dụng.'}
      </p>
      {ask !== 'ios' && (
        <button type="button" className="shrink-0 rounded-lg bg-[#C2310F] px-3 py-2 font-semibold" onClick={() => void ask.prompt().finally(close)}>
          Cài đặt
        </button>
      )}
      <button type="button" className="shrink-0 px-2 py-2 text-slate-300" onClick={close}>
        Để sau
      </button>
    </div>
  );
}
