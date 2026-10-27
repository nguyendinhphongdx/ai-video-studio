import { Boxes, Clapperboard, Inbox, LayoutGrid, Layers, ListVideo, Settings, Tv, Wallet, type LucideIcon } from 'lucide-react';

import { ROUTES } from '@/constants/routes';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const MAIN_NAV: NavItem[] = [
  { href: ROUTES.home, label: 'Tạo video', icon: Clapperboard },
  { href: ROUTES.review, label: 'Cần duyệt', icon: Inbox },
  { href: ROUTES.series, label: 'Series', icon: ListVideo },
  { href: ROUTES.library, label: 'Thư viện', icon: LayoutGrid },
];

export const SETUP_NAV: NavItem[] = [
  { href: ROUTES.channels, label: 'Kênh & thương hiệu', icon: Tv },
  { href: ROUTES.skills, label: 'Skills', icon: Layers },
  { href: ROUTES.tools, label: 'Tools', icon: Boxes },
  { href: ROUTES.usage, label: 'Chi phí', icon: Wallet },
  { href: ROUTES.settings, label: 'Cài đặt', icon: Settings },
];

export const isActive = (pathname: string, href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));
