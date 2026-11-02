import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-xs font-bold text-white">
            S
          </span>
          <div>
            <p className="text-sm font-semibold text-text">SkillMap</p>
            <p className="text-helper text-secondary">
              Учиться с направлением.
            </p>
          </div>
        </div>

        <p className="text-helper text-secondary">
          © 2026 SkillMap. Все права защищены.
        </p>

        <nav className="flex gap-6 text-helper text-secondary">
          <Link href="/privacy" className="hover:text-text">
            Конфиденциальность
          </Link>
          <Link href="/terms" className="hover:text-text">
            Условия использования
          </Link>
          <Link href="/contact" className="hover:text-text">
            Связаться с нами
          </Link>
        </nav>
      </div>
    </footer>
  );
}
