'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/shared/lib/cn';
import { Progress } from '@/shared/ui';

const NAV = [
  { href: '/map', label: 'Карта', icon: 'map', ready: true },
  { href: '/trajectory', label: 'Траектория', icon: 'path', ready: false },
  { href: '/gap', label: 'Gap Analysis', icon: 'gap', ready: false },
  { href: '/dashboard', label: 'Дашборд', icon: 'chart', ready: false },
  { href: '/integrations', label: 'Интеграции', icon: 'plug', ready: false },
  { href: '/profile', label: 'Профиль', icon: 'user', ready: true },
] as const;

function NavIcon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75 } as const;
  switch (name) {
    case 'map':
      return (
        <svg {...common}>
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
      );
    case 'path':
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="2" />
          <circle cx="18" cy="18" r="2" />
          <path d="M8 6h6a4 4 0 014 4v4" />
        </svg>
      );
    case 'gap':
      return (
        <svg {...common}>
          <path d="M4 19V5M4 19h16M4 12h10" strokeLinecap="round" />
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
          <path d="M12 2v6M8 4v4M16 4v4M6 10h12v2a6 6 0 01-12 0v-2z" strokeLinecap="round" />
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

type Props = {
  userName?: string;
  userRole?: string;
  userLevel?: string;
  goalTitle?: string;
  goalProgress?: number;
};

export function AppSidebar({
  userName,
  userRole,
  userLevel,
  goalTitle,
  goalProgress,
}: Props) {
  const pathname = usePathname();
  const initials = (userName ?? '')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const subtitle = [userRole, userLevel].filter(Boolean).join(' · ');

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-14 items-center gap-2 px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
          S
        </span>
        <span className="text-base font-semibold text-text">SkillMap</span>
      </div>

      <div className="px-4 pt-2">
        <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-secondary">
          Рабочее пространство
        </p>
        <p className="mt-1 px-2 text-sm font-semibold text-text">Моё обучение</p>
      </div>

      <nav className="mt-3 flex-1 space-y-0.5 px-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');

          if (!item.ready) {
            return (
              <span
                key={item.href}
                aria-disabled="true"
                title="Скоро"
                className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-secondary opacity-50"
              >
                <NavIcon name={item.icon} />
                {item.label}
                <span className="ml-auto rounded-full border border-border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide">
                  Скоро
                </span>
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-accent-soft text-accent'
                  : 'text-secondary hover:bg-page hover:text-text'
              )}
            >
              <NavIcon name={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Goal card — рендерим только когда цель реально выбрана */}
      {goalTitle && (
        <div className="mx-3 mb-3 rounded-xl border border-accent/15 bg-accent-soft/50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary">
            Ваша цель
          </p>
          <p className="mt-1 text-sm font-semibold text-text">{goalTitle}</p>
          <div className="mt-2 flex items-center justify-between text-helper text-secondary">
            <span>{userLevel ?? '—'}</span>
            <span className="font-semibold text-text">
              {Math.round(goalProgress ?? 0)}%
            </span>
          </div>
          <div className="mt-1.5">
            <Progress value={goalProgress ?? 0} showValue={false} size="sm" />
          </div>
        </div>
      )}

      {/* User */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-helper font-semibold text-accent">
            {initials || '·'}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text">
              {userName ?? 'Профиль'}
            </p>
            {subtitle && <p className="text-helper text-secondary">{subtitle}</p>}
          </div>
        </div>
        <button
          type="button"
          disabled
          title="Скоро"
          className="mt-2 flex cursor-not-allowed items-center gap-1.5 text-helper text-secondary opacity-60"
        >
          <span>?</span> Помощь и обратная связь
        </button>
      </div>
    </aside>
  );
}
