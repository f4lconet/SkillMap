'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2" aria-label="SkillMap — на главную">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            S
          </span>
          <span className="text-lg font-semibold tracking-tight text-text">
            SkillMap
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden items-center gap-8 text-sm font-medium text-secondary md:flex">
          {NAV.map((item) => {
            const active = item.match !== null && pathname.startsWith(item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn('transition-colors hover:text-text', active && 'text-accent')}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
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
                <span className="hidden max-w-[140px] truncate text-sm font-medium text-text sm:block">
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
                className="hidden text-sm font-medium text-secondary transition-colors hover:text-text sm:block"
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
      </div>
    </header>
  );
}
