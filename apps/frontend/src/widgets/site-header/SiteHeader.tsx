'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/shared/ui';
import { useSessionUser } from '@/features/auth';
import { cn } from '@/shared/lib/cn';

const NAV = [
  { href: '/#how', label: 'Как это работает', match: null },
  { href: '/catalog', label: 'Каталог профессий', match: '/catalog' },
  { href: '/demo', label: 'Демо-карта', match: '/demo' },
] as const;

function initialsOf(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Шапка публичных страниц (главная, каталог): логотип, навигация и состояние сессии. */
export function SiteHeader() {
  const pathname = usePathname();
  const { user, ready } = useSessionUser();
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
    <header className="sticky top-0 z-50 border-b border-border/60 bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="SkillMap — на главную"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            S
          </span>
          <span className="text-base font-semibold tracking-tight text-text sm:text-lg">
            SkillMap
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 text-sm font-medium text-secondary md:flex">
          {NAV.map((item) => {
            const active =
              item.match !== null && pathname.startsWith(item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'transition-colors hover:text-text',
                  active && 'text-accent'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop actions + mobile menu button */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-3 md:flex">
            {!ready ? (
              <div className="h-9 w-[184px]" aria-hidden />
            ) : user ? (
              <>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-page"
                  title="Перейти в профиль"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-helper font-semibold text-accent">
                    {initialsOf(user.name) || '·'}
                  </span>
                  <span className="max-w-[140px] truncate text-sm font-medium text-text">
                    {user.name}
                  </span>
                </Link>
                <Link href="/map">
                  <Button variant="primary" size="sm" className="h-9 px-4">
                    Моя карта
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth"
                  className="text-sm font-medium text-secondary transition-colors hover:text-text"
                >
                  Войти
                </Link>
                <Link href="/catalog">
                  <Button variant="primary" size="sm" className="h-9 px-4">
                    Начать бесплатно
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile: Меню */}
          <button
            type="button"
            onClick={toggleMenu}
            className="inline-flex h-9 items-center rounded-full border border-border bg-surface px-3.5 text-sm font-medium text-text md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
          >
            {menuOpen ? 'Закрыть' : 'Меню'}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div
          id="mobile-nav"
          className="border-t border-border bg-surface md:hidden"
        >
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV.map((item) => {
              const active =
                item.match !== null && pathname.startsWith(item.match);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className={cn(
                    'rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-accent-soft text-accent'
                      : 'text-secondary hover:bg-page hover:text-text'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="my-2 border-t border-border" />
            {!ready ? null : user ? (
              <>
                <Link
                  href="/profile"
                  onClick={closeMenu}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-secondary hover:bg-page hover:text-text"
                >
                  Профиль
                </Link>
                <Link
                  href="/map"
                  onClick={closeMenu}
                  className="mt-1 flex h-11 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-white"
                >
                  Моя карта
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth"
                  onClick={closeMenu}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-secondary hover:bg-page hover:text-text"
                >
                  Войти
                </Link>
                <Link
                  href="/catalog"
                  onClick={closeMenu}
                  className="mt-1 flex h-11 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-white"
                >
                  Начать бесплатно
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
