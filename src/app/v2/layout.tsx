import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './v2.css';

export const metadata: Metadata = { title: { default: 'Studio v2', template: '%s · Studio v2' } };

/** v2 lives beside v1 under /v2 while it is rebuilt; every v2 style is scoped to this wrapper. */
export default function V2Layout({ children }: { children: ReactNode }) {
  return <div className="v2">{children}</div>;
}
