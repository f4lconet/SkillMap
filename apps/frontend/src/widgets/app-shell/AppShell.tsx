'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { UserRole } from '@/entities/user';
import { cn } from '@/shared/lib/cn';
import { Logo } from '@/shared/ui';
import { AppSidebar } from './AppSidebar';

type Props = {
  children: React.ReactNode;
  breadcrumb?: string[];
  savedHint?: string;
  userName?: string;
  userRole?: UserRole;
  goalTitle?: string;
  goalProgress?: number;
  userLevel?: string;
};

const MOBILE_NAV = [
  { href: '/map', label: 'Карта', icon: 'map', ready: true },
  { href: '/trajectory', label: 'Траектория', icon: 'path', ready: true },
  { href: '/gap', label: 'Gap Analysis', icon: 'gap', ready: true },
  { href: '/dashboard', label: 'Дашборд', icon: 'chart', ready: true },
  { href: '/integrations', label: 'Интеграции', icon: 'plug', ready: true },
  { href: '/profile', label: 'Профиль', icon: 'user', ready: true },
] as const;

function PillIcon({ name }: { name: string }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
  } as const;
  switch (name) {
    case 'map':
      return (
        <svg {...common}>
          <path d="M12 2v4M8 4v2M16 4v2" strokeLinecap="round" />
          <circle cx="12" cy="14" r="6" />
          <path d="M12 12v2" strokeLinecap="round" />
        </svg>
      );
    case 'path':
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="2" />
          <circle cx="18" cy="18" r="2" />
          <path d="M8 6h6a4 4 0 014 4v4" strokeLinecap="round" />
        </svg>
      );
    case 'gap':
      return (
        <svg {...common}>
          <path d="M8 8h8v8H8z" />
          <path d="M4 12h4M16 12h4" strokeLinecap="round" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...common}>
          <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" />
        </svg>
      );
    case 'plug':
      return (
        <svg {...common}>
          <path
            d="M12 2v6M8 4v4M16 4v4M6 10h12v2a6 6 0 01-12 0v-2z"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
  }
}

export function AppShell({
  children,
  breadcrumb = ['Моё обучение'],
  savedHint = 'Все изменения сохранены',
  userName,
  userRole,
  goalTitle,
  goalProgress,
  userLevel,
}: Props) {
  const pathname = usePathname();
  // Путь хранится рядом с флагом: при переходе меню закрывается само,
  // без синхронизации состояния через useEffect.
  const [menuState, setMenuState] = useState({ open: false, path: pathname });
  const menuOpen = menuState.open && menuState.path === pathname;
  const closeMenu = () => setMenuState({ open: false, path: pathname });
  const toggleMenu = () => setMenuState({ open: !menuOpen, path: pathname });

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuState((s) => ({ ...s, open: false }));
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <div className="flex min-h-screen bg-page">
      <div className="sticky top-0 hidden h-screen md:block">
        <AppSidebar
          userName={userName}
          userRole={userRole}
          goalTitle={goalTitle}
          goalProgress={goalProgress}
          userLevel={userLevel}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top: logo + menu */}
        <div className="sticky top-0 z-40 border-b border-border/60 bg-surface md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2">
              <Logo size={32} />
              <span className="text-base font-semibold text-text">SkillMap</span>
            </Link>
            <button
              type="button"
              onClick={toggleMenu}
              className="inline-flex h-9 items-center rounded-full border border-border bg-surface px-3.5 text-sm font-medium text-text"
              aria-expanded={menuOpen}
              aria-controls="app-mobile-menu"
            >
              {menuOpen ? 'Закрыть' : 'Меню'}
            </button>
          </div>

          {/* Section pills — как на макете */}
          <div className="overflow-x-auto border-t border-border/40 px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max items-center gap-1.5">
              {MOBILE_NAV.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + '/');
                if (!item.ready) {
                  return (
                    <span
                      key={item.href}
                      className="inline-flex items-center gap-1.5 rounded-full border border-transparent px-3 py-2 text-sm font-medium text-secondary/50"
                      title="Скоро"
                    >
                      <PillIcon name={item.icon} />
                      {item.label}
                    </span>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-accent-soft text-accent'
                        : 'text-secondary hover:bg-page hover:text-text'
                    )}
                  >
                    <PillIcon name={item.icon} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Breadcrumb under pills */}
          <div className="flex items-center justify-between gap-2 border-t border-border/40 px-4 py-2">
            <nav className="flex min-w-0 items-center gap-1.5 text-xs text-secondary">
              {breadcrumb.map((item, i) => (
                <span key={i} className="flex min-w-0 items-center gap-1.5">
                  {i > 0 && <span className="text-border">›</span>}
                  <span
                    className={cn(
                      'truncate',
                      i === breadcrumb.length - 1 && 'font-medium text-text'
                    )}
                  >
                    {item}
                  </span>
                </span>
              ))}
            </nav>
            <span className="shrink-0 text-[11px] text-secondary">{savedHint}</span>
          </div>

          {menuOpen && (
            <div
              id="app-mobile-menu"
              className="border-t border-border bg-surface px-3 py-2"
            >
              {MOBILE_NAV.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + '/');
                if (!item.ready) {
                  return (
                    <span
                      key={item.href}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-secondary/50"
                    >
                      <PillIcon name={item.icon} />
                      {item.label}
                      <span className="ml-auto text-[10px] uppercase">Скоро</span>
                    </span>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium',
                      active
                        ? 'bg-accent-soft text-accent'
                        : 'text-secondary hover:bg-page hover:text-text'
                    )}
                  >
                    <PillIcon name={item.icon} />
                    {item.label}
                  </Link>
                );
              })}
              <div className="my-1 border-t border-border" />
              <Link
                href="/"
                onClick={closeMenu}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-secondary hover:bg-page"
              >
                На главную
              </Link>
            </div>
          )}
        </div>

        {/* Desktop top bar */}
        <header className="hidden h-14 shrink-0 items-center justify-between border-b border-border/60 bg-surface px-4 sm:px-6 md:flex">
          <nav className="flex items-center gap-2 text-sm text-secondary">
            {breadcrumb.map((item, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-border">›</span>}
                <span
                  className={
                    i === breadcrumb.length - 1 ? 'font-medium text-text' : ''
                  }
                >
                  {item}
                </span>
              </span>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-helper text-secondary">
            <span>{savedHint}</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
