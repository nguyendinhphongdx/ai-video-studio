'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { Clapperboard, House, Images, Library, Menu, Palette, Puzzle, Settings, X, type LucideIcon } from 'lucide-react';

import { LogoMark } from '@/components/brand/LogoMark';
import { AccountBox } from '@/features/auth/AccountBox';

import { projectHref } from './model';
import './mobile.css';

/** `tab` puts the item in the bottom bar of narrow screens, under a shorter name. */
type NavItem = { href: string; label: string; exact?: boolean; tab?: { label: string; icon: LucideIcon } };

function useCurrent(items: NavItem[]) {
  const path = usePathname();
  const isOn = (i: NavItem) => (i.exact ? path === i.href : path === i.href || path.startsWith(`${i.href}/`));
  // The longest matching href wins, so "/" does not light up on every page.
  return items.filter(isOn).sort((a, b) => b.href.length - a.href.length)[0];
}

function TabBar({ label, items }: { label: string; items: NavItem[] }) {
  const on = useCurrent(items);
  return (
    <nav className="tabbar" aria-label={label}>
      {items.map((i) =>
        i.tab ? (
          <Link key={i.href} href={i.href} className={i === on ? 'on' : undefined} aria-current={i === on ? 'page' : undefined}>
            <i.tab.icon size={20} aria-hidden />
            {i.tab.label}
          </Link>
        ) : null,
      )}
    </nav>
  );
}

function Nav({ label, items, group }: { label: string; items: NavItem[]; group?: { at: number; text: string } }) {
  const on = useCurrent(items);
  return (
    <nav className="nav" aria-label={label}>
      {items.map((i, n) => (
        <span key={i.href} style={{ display: 'contents' }}>
          {group && n === group.at && <span className="eyebrow grp">{group.text}</span>}
          <Link className={i === on ? 'on' : undefined} href={i.href} aria-current={i === on ? 'page' : undefined}>
            {i.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}

/** Lets the top bar open the side menu, which is a sheet over the page on narrow screens. */
const MenuContext = createContext<() => void>(() => undefined);

function Frame({ nav, tabs, children }: { nav: ReactNode; tabs: ReactNode; children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  // Going somewhere closes the sheet; so does Escape.
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <MenuContext.Provider value={() => setOpen(true)}>
      <div className="app" style={{ minHeight: '100dvh' }}>
        {open && <div className="side-scrim" onClick={() => setOpen(false)} aria-hidden />}
        <aside className={`side${open ? ' open' : ''}`} id="side-menu" aria-label="Menu">
          <div className="side-head">
            <Link href="/" className="brand" style={{ color: 'inherit', textDecoration: 'none' }}>
              <LogoMark />
              Studio
            </Link>
            <button type="button" className="icon-btn side-close" aria-label="Đóng menu" onClick={() => setOpen(false)}>
              <X size={18} aria-hidden />
            </button>
          </div>
          {nav}
          <AccountBox />
        </aside>
        <div className="main">{children}</div>
        {tabs}
      </div>
    </MenuContext.Provider>
  );
}

/** Product level: overview of every project. */
export function ProductShell({ children }: { children: ReactNode }) {
  const items: NavItem[] = [
    { href: '/', label: 'Trang chủ', exact: true, tab: { label: 'Trang chủ', icon: House } },
    { href: '/library', label: 'Thư viện', tab: { label: 'Thư viện', icon: Library } },
    { href: '/skills', label: 'Kho skill', tab: { label: 'Kho skill', icon: Puzzle } },
    { href: '/settings', label: 'Cài đặt và chi phí', tab: { label: 'Cài đặt', icon: Settings } },
  ];
  return <Frame nav={<Nav label="Chính" items={items} />} tabs={<TabBar label="Chính, thanh dưới" items={items} />}>{children}</Frame>;
}

/** Project level: everything one project owns. */
export function ProjectShell({ projectId, name, children }: { projectId: string; name: string; children: ReactNode }) {
  const items: NavItem[] = [
    { href: '/', label: '← Tất cả dự án', exact: true },
    { href: projectHref(projectId), label: 'Các tập', exact: false, tab: { label: 'Các tập', icon: Clapperboard } },
    { href: projectHref(projectId, 'library'), label: 'Thư viện dự án', tab: { label: 'Thư viện', icon: Images } },
    { href: projectHref(projectId, 'style'), label: 'Phong cách và skill', tab: { label: 'Phong cách', icon: Palette } },
    { href: projectHref(projectId, 'settings'), label: 'Cài đặt dự án', tab: { label: 'Cài đặt', icon: Settings } },
  ];
  return <Frame nav={<Nav label="Dự án" items={items} group={{ at: 1, text: name || 'Dự án' }} />} tabs={<TabBar label="Dự án, thanh dưới" items={items} />}>{children}</Frame>;
}

/** A breadcrumb: plain text, or text that goes somewhere (every part but the last should). */
export type Crumb = string | { label: string; href: string };

export function Topbar({ crumbs, children }: { crumbs: Crumb[]; children?: ReactNode }) {
  const openMenu = useContext(MenuContext);
  return (
    <header className="top">
      <button type="button" className="icon-btn menu-btn" aria-label="Mở menu" aria-controls="side-menu" onClick={openMenu}>
        <Menu size={20} aria-hidden />
      </button>
      <nav className="crumbs" aria-label="Vị trí">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          const label = typeof c === 'string' ? c : c.label;
          return (
            <span key={i} style={{ display: 'contents' }}>
              {i > 0 && <span aria-hidden>/</span>}
              {last ? <b aria-current="page">{label}</b> : typeof c === 'object' ? <Link href={c.href}>{label}</Link> : <span>{label}</span>}
            </span>
          );
        })}
      </nav>
      {children}
    </header>
  );
}

export function Page({ width = 1180, children }: { width?: number; children: ReactNode }) {
  return (
    <div className="page" style={{ maxWidth: width }}>
      {children}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card" style={{ alignItems: 'center', textAlign: 'center', padding: 48 }}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export function Loading() {
  return <div className="card flat cap">Đang tải…</div>;
}
