'use client';

import { AppSidebar } from './AppSidebar';

type Props = {
  children: React.ReactNode;
  breadcrumb?: string[];
  savedHint?: string;
  userName?: string;
  userRole?: string;
  goalTitle?: string;
  goalProgress?: number;
  userLevel?: string;
};

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
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-surface px-4 sm:px-6">
          <nav className="flex items-center gap-2 text-sm text-secondary">
            {breadcrumb.map((item, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-border">›</span>}
                <span className={i === breadcrumb.length - 1 ? 'font-medium text-text' : ''}>
                  {item}
                </span>
              </span>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-helper text-secondary">
            <span className="hidden sm:inline">{savedHint}</span>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-page"
              aria-label="Уведомления"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
