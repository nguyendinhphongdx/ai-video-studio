import { Clapperboard, LayoutGrid, ListVideo, Settings, Tv, Wallet, type LucideIcon } from 'lucide-react';

import { ROUTES } from '@/constants/routes';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Other paths that belong to this item (so it stays highlighted on them). */
  also?: string[];
}

/** The four screens used every day. Review, skills and tools live inside these (a filter, the channel's advanced section). */
export const MAIN_NAV: NavItem[] = [
  { href: ROUTES.home, label: 'Tạo video', icon: Clapperboard },
  { href: ROUTES.library, label: 'Video', icon: LayoutGrid, also: [ROUTES.review, '/episodes'] },
  { href: ROUTES.series, label: 'Series', icon: ListVideo },
  { href: ROUTES.channels, label: 'Kênh', icon: Tv, also: [ROUTES.skills, ROUTES.tools, ROUTES.templates] },
];

export const SETUP_NAV: NavItem[] = [
  { href: ROUTES.usage, label: 'Chi phí', icon: Wallet },
  { href: ROUTES.settings, label: 'Cài đặt', icon: Settings },
];

export const isActive = (pathname: string, href: string, also: string[] = []) => [href, ...also].some((h) => (h === '/' ? pathname === '/' : pathname === h || pathname.startsWith(`${h}/`)));
