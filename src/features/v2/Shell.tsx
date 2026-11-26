'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { LogoMark } from '@/components/brand/LogoMark';

import { projectHref } from './model';

type NavItem = { href: string; label: string; exact?: boolean };

function Nav({ label, items, group }: { label: string; items: NavItem[]; group?: { at: number; text: string } }) {
  const path = usePathname();
  const isOn = (i: NavItem) => (i.exact ? path === i.href : path === i.href || path.startsWith(`${i.href}/`));
  // The longest matching href wins, so "/" does not light up on every page.
  const on = items.filter(isOn).sort((a, b) => b.href.length - a.href.length)[0];
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

function Frame({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  return (
    <div className="app" style={{ minHeight: '100dvh' }}>
      <aside className="side">
        <Link href="/" className="brand" style={{ color: 'inherit', textDecoration: 'none' }}>
          <LogoMark />
          Studio
        </Link>
        {nav}
      </aside>
      <div className="main">{children}</div>
    </div>
  );
}

/** Product level: overview of every project. */
export function ProductShell({ children }: { children: ReactNode }) {
  const items: NavItem[] = [
    { href: '/', label: 'Trang chủ', exact: true },
    { href: '/library', label: 'Thư viện' },
    { href: '/skills', label: 'Kho skill' },
    { href: '/settings', label: 'Cài đặt và chi phí' },
  ];
  return <Frame nav={<Nav label="Chính" items={items} />}>{children}</Frame>;
}

/** Project level: everything one project owns. */
export function ProjectShell({ projectId, name, children }: { projectId: string; name: string; children: ReactNode }) {
  const items: NavItem[] = [
    { href: '/', label: '← Tất cả dự án', exact: true },
    { href: projectHref(projectId), label: 'Các tập', exact: false },
    { href: projectHref(projectId, 'library'), label: 'Thư viện dự án' },
    { href: projectHref(projectId, 'style'), label: 'Phong cách và skill' },
    { href: projectHref(projectId, 'settings'), label: 'Cài đặt dự án' },
  ];
  return <Frame nav={<Nav label="Dự án" items={items} group={{ at: 1, text: name || 'Dự án' }} />}>{children}</Frame>;
}

export function Topbar({ crumbs, children }: { crumbs: ReactNode[]; children?: ReactNode }) {
  return (
    <header className="top">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: 'contents' }}>
            {i > 0 && <span>/</span>}
            {i === crumbs.length - 1 ? <b>{c}</b> : <span>{c}</span>}
          </span>
        ))}
      </div>
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
