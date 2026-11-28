import type { ReactNode } from 'react';

import { ProductShell } from '@/features/v2/Shell';

export default function ProductLayout({ children }: { children: ReactNode }) {
  return <ProductShell>{children}</ProductShell>;
}
