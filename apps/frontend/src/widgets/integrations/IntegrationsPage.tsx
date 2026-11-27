'use client';

import { AppShell } from '@/widgets/app-shell';
import { Button } from '@/shared/ui';
import { useSessionUser } from '@/features/auth';
import { cn } from '@/shared/lib/cn';

type ImportItem = {
  repo: string;
  skill: string;
  status: 'on-map' | 'review';
};

const IMPORT_ITEMS: ImportItem[] = [
  { repo: 'portfolio-website', skill: 'HTML и CSS', status: 'on-map' },
  { repo: 'repo-search', skill: 'Асинхронность', status: 'review' },
  { repo: 'debug-playground', skill: 'DevTools', status: 'review' },
];

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

/**
 * Интеграции: mobile + desktop.
 * Подключение сервисов пока-заглушки (без API).
 */
export function IntegrationsPage() {
  const { user } = useSessionUser();

  return (
    <AppShell
      breadcrumb={['Моё обучение', 'Интеграции']}
      userName={user?.name}
      userRole={user?.role}
    >
      <div className="mx-auto max-w-[1080px] px-4 py-4 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="max-w-2xl">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-text sm:text-[32px]">
            Ваш опыт уже с вами
          </h1>
          <p className="mt-2 text-sm text-secondary sm:text-body">
            Подключите сервисы, проверьте найденные навыки и дополните карту
            вручную.
          </p>
        </div>

        {/* Connection cards — 1 col mobile, 3 col desktop */}
        <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
          {/* GitHub */}
          <section className="flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-page text-text">
                <GitHubIcon />
              </div>
              <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
                Подключён
              </span>
            </div>
            <h2 className="mt-4 text-base font-semibold text-text">GitHub</h2>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-secondary">
              @elena-sm · 8 открытых репозиториев
              <br />
              Последняя синхронизация: сегодня, 12:35
            </p>
            <Button
              variant="secondary"
              className="mt-5 w-full"
              disabled
              title="Скоро"
            >
              ↻ Обновить данные
            </Button>
            <button
              type="button"
              className="mt-3 text-left text-sm font-medium text-secondary transition-colors hover:text-danger"
            >
              Отключить GitHub
            </button>
          </section>

          {/* Stepik */}
          <section className="flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success-soft text-sm font-bold text-success">
                S
              </div>
              <span className="rounded-full bg-page px-2.5 py-1 text-xs font-medium text-secondary">
                Не подключён
              </span>
            </div>
            <h2 className="mt-4 text-base font-semibold text-text">Stepik</h2>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-secondary">
              Импортируйте завершённые курсы и сопоставьте их с навыками вашей
              цели.
            </p>
            <Button
              variant="secondary"
              className="mt-5 w-full"
              disabled
              title="Скоро"
            >
              ↗ Подключить Stepik
            </Button>
            <p className="mt-3 text-xs text-secondary">
              Вы сами выбираете, какие навыки добавить.
            </p>
          </section>

          {/* Manual */}
          <section className="flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)] sm:p-5 md:col-span-2 xl:col-span-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-lg text-accent">
                ✎
              </div>
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                Всегда доступен
              </span>
            </div>
            <h2 className="mt-4 text-base font-semibold text-text">
              Добавить вручную
            </h2>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-secondary">
              Курсы, стажировки, рабочие задачи — ваш опыт не ограничен
              платформами.
            </p>
            <Button
              variant="secondary"
              className="mt-5 w-full"
              disabled
              title="Скоро"
            >
              + Добавить навык
            </Button>
            <p className="mt-3 text-xs text-secondary">
              Укажите навык и текущий статус.
            </p>
          </section>
        </div>

        {/* Import results + manual form — stack mobile, 2 col desktop */}
        <div className="mt-5 grid gap-4 sm:mt-6 sm:gap-5 lg:grid-cols-[1.2fr_0.9fr]">
          {/* Import list */}
          <section className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)] sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-text">
                  GitHub: импорт завершён
                </h2>
                <p className="mt-1 text-sm text-secondary">
                  Сегодня, 12:35 · Проверено 8 репозиториев · Найдено 3
                  соответствия
                </p>
              </div>
              <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
                ✓ Готово к проверке
              </span>
            </div>

            {/* Desktop table header */}
            <div className="mt-5 hidden grid-cols-[1fr_1fr_auto] gap-3 border-b border-border pb-2 text-[11px] font-semibold uppercase tracking-wider text-secondary lg:grid">
              <span>Источник</span>
              <span>Найденный навык</span>
              <span className="text-right">Действие</span>
            </div>

            <ul className="divide-y divide-border lg:mt-0">
              {IMPORT_ITEMS.map((item) => (
                <li
                  key={item.repo}
                  className={cn(
                    'py-3.5',
                    'lg:grid lg:grid-cols-[1fr_1fr_auto] lg:items-center lg:gap-3'
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 text-secondary" aria-hidden>
                      📄
                    </span>
                    <div>
                      <p className="text-sm font-medium text-secondary lg:text-text">
                        {item.repo}
                      </p>
                      <p className="text-sm font-semibold text-text lg:hidden">
                        Навык: {item.skill}
                      </p>
                    </div>
                  </div>
                  <div className="mt-1.5 pl-7 lg:mt-0 lg:pl-0">
                    <p className="hidden text-sm font-medium text-text lg:block">
                      {item.skill}
                    </p>
                    {item.status === 'on-map' ? (
                      <span className="inline-flex rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
                        Уже на карте
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-[#FFF8E8] px-2 py-0.5 text-xs font-medium text-warning">
                        Нужна проверка
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="mt-1.5 pl-7 text-left text-sm font-medium text-accent hover:underline lg:mt-0 lg:pl-0 lg:text-right"
                  >
                    {item.status === 'on-map' ? 'Просмотреть' : 'Проверить →'}
                  </button>
                </li>
              ))}
            </ul>

            <p className="mt-4 rounded-xl bg-page px-3.5 py-2.5 text-xs leading-relaxed text-secondary">
              🛡 Импорт не меняет ваши отметки автоматически. Сначала проверьте
              соответствие, затем подтвердите навык.
            </p>
          </section>

          {/* Manual form */}
          <section className="h-fit rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)] sm:p-5 lg:sticky lg:top-6">
            <h2 className="text-base font-semibold text-text">
              Добавить опыт вручную
            </h2>
            <div className="mt-4 space-y-3.5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-secondary">
                  Навык
                </label>
                <div className="flex h-11 cursor-not-allowed items-center justify-between rounded-lg border border-border bg-surface px-3 text-sm text-secondary opacity-80">
                  Выберите навык
                  <span aria-hidden>▾</span>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-secondary">
                  Статус
                </label>
                <div className="flex h-11 cursor-not-allowed items-center justify-between rounded-lg border border-border bg-surface px-3 text-sm text-text opacity-80">
                  В процессе
                  <span aria-hidden>▾</span>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-secondary">
                  Источник или комментарий
                </label>
                <input
                  type="text"
                  disabled
                  placeholder="Введите ссылку на проект или название курса"
                  className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none placeholder:text-secondary disabled:cursor-not-allowed disabled:opacity-80"
                />
              </div>
              <p className="text-xs text-secondary">
                Навык должен относиться к вашей цели
              </p>
              <Button
                variant="primary"
                className="w-full"
                disabled
                title="Скоро"
              >
                Сохранить отметку
              </Button>
            </div>
          </section>
        </div>

        {/* Privacy */}
        <section className="mt-5 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)] sm:mt-6 sm:flex-row sm:items-start sm:gap-5 sm:p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-page text-lg text-secondary">
            🔒
          </div>
          <div>
            <h2 className="text-base font-semibold text-text">
              Доступ под вашим контролем
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-secondary">
              Подключения можно отключить в любой момент. Уже подтверждённые
              навыки останутся на карте. Приватные репозитории не используются.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
