import { Clapperboard, LayoutGrid, LayoutTemplate, ListVideo, Settings, Sparkles, Tv, Wallet, Wrench, type LucideIcon } from 'lucide-react';

import { ROUTES } from '@/constants/routes';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Other paths that belong to this item (so it stays highlighted on them). */
  also?: string[];
}

/** The four screens used every day. Review lives inside Video (a filter). */
export const MAIN_NAV: NavItem[] = [
  { href: ROUTES.home, label: 'Tạo video', icon: Clapperboard },
  { href: ROUTES.library, label: 'Video', icon: LayoutGrid, also: [ROUTES.review, '/episodes'] },
  { href: ROUTES.series, label: 'Series', icon: ListVideo },
  { href: ROUTES.channels, label: 'Kênh', icon: Tv },
];

/** Less frequent screens, still one click away: the library of looks, the channel's video styles, the building blocks. */
export const MORE_NAV: NavItem[] = [
  { href: ROUTES.templates, label: 'Thư viện mẫu', icon: LayoutTemplate },
  { href: ROUTES.skills, label: 'Kiểu video', icon: Sparkles },
  { href: ROUTES.tools, label: 'Công cụ dựng', icon: Wrench },
];

export const SETUP_NAV: NavItem[] = [
  { href: ROUTES.usage, label: 'Chi phí', icon: Wallet },
  { href: ROUTES.settings, label: 'Cài đặt', icon: Settings },
];

export const isActive = (pathname: string, href: string, also: string[] = []) => [href, ...also].some((h) => (h === '/' ? pathname === '/' : pathname === h || pathname.startsWith(`${h}/`)));
