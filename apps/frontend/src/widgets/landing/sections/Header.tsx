import Link from 'next/link';
import { Button } from '@/shared/ui';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            S
          </span>
          <span className="text-lg font-semibold tracking-tight text-text">
            SkillMap
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden items-center gap-8 text-sm font-medium text-secondary md:flex">
          <Link href="#how" className="transition-colors hover:text-text">
            Как это работает
          </Link>
          <Link href="#catalog" className="transition-colors hover:text-text">
            Каталог профессий
          </Link>
          <Link href="/demo" className="transition-colors hover:text-text">
            Демо-карта
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/auth"
            className="hidden text-sm font-medium text-secondary transition-colors hover:text-text sm:block"
          >
            Войти
          </Link>
          <Button variant="primary" size="sm" className="h-9 px-4">
            Начать бесплатно
          </Button>
        </div>
      </div>
    </header>
  );
}
