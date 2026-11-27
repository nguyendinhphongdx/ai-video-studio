import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import '../(studio)/v2.css';

export const metadata: Metadata = { title: { default: 'Đăng nhập', template: '%s · AI Video Studio' } };

/** Signed-out pages: the studio's look, no sidebar and no assistant. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="v2">{children}</div>;
}
