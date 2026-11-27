'use client';

import Link from 'next/link';
import { useState } from 'react';

const MOBILE_LINKS = [
  { href: '/', label: 'На главную' },
  { href: '/catalog', label: 'Каталог профессий' },
  { href: '/demo', label: 'Демо-карта' },
] as const;

/** Верхняя панель страницы входа: логотип, возврат и мобильное меню. */
export function AuthHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-surface">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            S
          </span>
          <span className="text-base font-semibold text-text sm:text-lg">
            SkillMap
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden text-sm font-medium text-secondary transition-colors hover:text-text sm:inline"
          >
            ← Вернуться на главную
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-9 items-center rounded-full border border-border bg-surface px-3.5 text-sm font-medium text-text sm:hidden"
            aria-expanded={menuOpen}
            aria-controls="auth-mobile-menu"
          >
            {menuOpen ? 'Закрыть' : 'Меню'}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div
          id="auth-mobile-menu"
          className="border-t border-border px-4 py-3 sm:hidden"
        >
          {MOBILE_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-secondary hover:bg-page"
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
