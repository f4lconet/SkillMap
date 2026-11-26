'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/shared/lib/cn';
import { ROUTES } from '@/shared/config';

type PublicationInfo = {
  title: string;
  badge: string;
  tone: 'success' | 'warning';
};

type UserInfo = {
  name: string;
  role: string;
};

type Props = {
  breadcrumb: string[];
  saveStatus?: string;
  onReload?: () => void;
  publication?: PublicationInfo | null;
  user?: UserInfo | null;
  children: ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: string;
  disabled?: boolean;
};

const NAV: NavItem[] = [
  { href: '/admin', label: 'Обзор', icon: '▦' },
  { href: '/admin/graph', label: 'Граф', icon: '⬡' },
  { href: '/admin/resources', label: 'Ресурсы', icon: '▤' },
  { href: '/admin/history', label: 'История изменений', icon: '↺' },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function AdminShell({
  breadcrumb,
  saveStatus,
  onReload,
  publication,
  user,
  children,
}: Props) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-page text-text">
      <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="flex h-14 items-center gap-2 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            S
          </span>
          <span className="text-base font-semibold">SkillMap</span>
        </div>

        <div className="px-5 pt-1">
          <p className="text-[10px] font-semibold tracking-[0.08em] text-secondary uppercase">
            Рабочее пространство
          </p>
          <p className="mt-1 text-sm font-semibold">Команда SkillMap</p>
        </div>

        <nav className="mt-3 flex-1 space-y-0.5 px-3">
          <Link
            href={ROUTES.dashboard}
            title="Вернуться в рабочее пространство"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-secondary hover:bg-page hover:text-text"
          >
            <span className="w-4 text-center text-xs opacity-80">←</span>
            Моё обучение
          </Link>
          <div className="my-2 border-t border-border" />

          {NAV.map((item) => {
            const active =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);
            if (item.disabled) {
              return (
                <span
                  key={item.href}
                  title="Раздел в разработке"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-secondary/60"
                >
                  <span className="w-4 text-center text-xs opacity-80">{item.icon}</span>
                  {item.label}
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium',
                  active
                    ? 'bg-accent-soft text-accent'
                    : 'text-secondary hover:bg-page hover:text-text'
                )}
              >
                <span className="w-4 text-center text-xs opacity-80">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {publication && (
          <div className="mx-3 mb-3 rounded-xl border border-border bg-page p-3">
            <p className="text-[10px] font-semibold tracking-[0.08em] text-secondary uppercase">
              Публикация
            </p>
            <p className="mt-1 text-sm font-semibold text-text">{publication.title}</p>
            <span
              className={cn(
                'mt-2 inline-block rounded-full px-2.5 py-1 text-helper font-medium',
                publication.tone === 'warning'
                  ? 'bg-[#FFF8E8] text-warning'
                  : 'bg-success-soft text-success'
              )}
            >
              {publication.badge}
            </span>
          </div>
        )}

        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
              {initials(user?.name ?? 'Редактор')}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.name ?? 'Редактор'}</p>
              <p className="text-xs text-secondary">{user?.role ?? 'Контент-редактор'}</p>
            </div>
          </div>
          <button
            type="button"
            className="mt-2 text-xs text-secondary hover:text-text"
          >
            ? Помощь и обратная связь
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/80 bg-surface px-4 sm:px-6">
          <nav className="flex items-center gap-2 text-sm text-secondary">
            {breadcrumb.map((part, i) => (
              <span key={part} className="flex items-center gap-2">
                {i > 0 && <span className="text-border">›</span>}
                <span className={i === breadcrumb.length - 1 ? 'font-medium text-text' : ''}>
                  {part}
                </span>
              </span>
            ))}
          </nav>
          {saveStatus && (
            <div className="flex items-center gap-2 text-xs text-secondary">
              <span>{saveStatus}</span>
              {onReload && (
                <button
                  type="button"
                  onClick={onReload}
                  className="rounded-md p-1 hover:bg-page"
                  aria-label="Обновить"
                  title="Обновить данные"
                >
                  ↻
                </button>
              )}
            </div>
          )}
        </header>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
