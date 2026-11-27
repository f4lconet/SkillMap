'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/widgets/app-shell';
import { Button } from '@/shared/ui';
import { useGapData, type GapPriority } from '@/features/gap';
import type { SkillStatus } from '@/entities/skill';
import { USER_LEVEL_LABELS } from '@/entities/user';
import { cn } from '@/shared/lib/cn';
import { shareApi, type ExportPayload } from '@/entities/public-profile';
import { PrintablePdfReport } from '@/features/pdf-export';

const STATUS_UI: Record<
  SkillStatus,
  { label: string; className: string }
> = {
  learning: {
    label: 'В процессе',
    className: 'bg-accent-soft text-accent',
  },
  not_started: {
    label: 'Не начат',
    className: 'bg-page text-secondary',
  },
  mastered: {
    label: 'Освоено',
    className: 'bg-success-soft text-success',
  },
  skipped: {
    label: 'Пропущено',
    className: 'bg-page text-secondary',
  },
};

const PRIORITY_UI: Record<GapPriority, { label: string; className: string }> = {
  high: { label: 'Высокий', className: 'text-warning' },
  medium: { label: 'Средний', className: 'text-secondary' },
  low: { label: 'Низкий', className: 'text-secondary' },
};

const SKILL_FORMS: [string, string, string] = ['навык', 'навыка', 'навыков'];

function pluralSkills(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return SKILL_FORMS[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return SKILL_FORMS[1];
  }
  return SKILL_FORMS[2];
}

export function GapAnalysisPage() {
  const { user, view, loading, error, reload } = useGapData();
  const [showAll, setShowAll] = useState(false);
  const [exportPayload, setExportPayload] = useState<ExportPayload | null>(null);
  const [exportPending, setExportPending] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const levelLabel = user?.level ? USER_LEVEL_LABELS[user.level] : null;
  const rows = useMemo(() => view?.rows ?? [], [view]);
  const visible = useMemo(
    () => (showAll ? rows : rows.slice(0, 7)),
    [rows, showAll]
  );
  const hiddenCount = Math.max(0, rows.length - 7);
  const listedHours = visible.reduce((sum, x) => sum + x.hoursLeft, 0);
  const focus = rows[0] ?? null;

  const handleExportPdf = async () => {
    if (!user?.targetProfession?.id) return;
    setExportPending(true);
    setExportError(null);
    try {
      const payload = await shareApi.getExport(user.targetProfession.id);
      setExportPayload(payload);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );
      window.print();
    } catch {
      setExportError('Не удалось подготовить PDF-отчёт. Попробуйте ещё раз.');
    } finally {
      setExportPending(false);
    }
  };

  const shellProps = {
    breadcrumb: ['Моё обучение', 'Gap Analysis'],
    userName: user?.name,
    userRole: user?.role,
    goalTitle: view?.professionTitle ?? user?.targetProfession?.title,
    goalProgress: view?.percent ?? 0,
    userLevel: levelLabel ?? undefined,
  };

  if (loading) {
    return (
      <AppShell {...shellProps}>
        <div className="mx-auto max-w-[1200px] px-4 py-16 text-center text-body text-secondary sm:px-6">
          Считаем пробелы в навыках…
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell {...shellProps}>
        <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
          <div className="rounded-2xl border border-danger/30 bg-danger-soft px-5 py-4 text-body text-danger">
            {error}
          </div>
          <Button variant="primary" className="mt-4" onClick={() => void reload()}>
            Повторить
          </Button>
        </div>
      </AppShell>
    );
  }

  if (!user?.targetProfession) {
    return (
      <AppShell {...shellProps}>
        <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-text sm:text-h2">Цель пока не выбрана</h1>
          <p className="mt-2 max-w-xl text-body leading-relaxed text-secondary">
            Выберите профессию и отметьте известные навыки — после этого покажем,
            что осталось освоить и сколько времени это займёт.
          </p>
          <Link href="/catalog">
            <Button variant="primary" className="mt-5">
              Выбрать профессию
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!view || view.total === 0) {
    return (
      <AppShell {...shellProps}>
        <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-text sm:text-h2">
            Gap Analysis ещё не готов
          </h1>
          <p className="mt-2 max-w-xl text-body leading-relaxed text-secondary">
            Для «{user.targetProfession.title}» пока не заполнены навыки и связи.
            Загляните в каталог и выберите другую профессию.
          </p>
          <Link href="/catalog">
            <Button variant="primary" className="mt-5">
              Выбрать другую профессию
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const s = view;
  const masteredPct = (s.mastered / s.total) * 100;
  const progressPct = (s.inProgress / s.total) * 100;
  const notStartedPct = (s.notStarted / s.total) * 100;

  return (
    <>
      <AppShell {...shellProps}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              Сравнение с целью{levelLabel ? ` · ${levelLabel}` : ''}
            </p>
            <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight text-text sm:text-h2">
              Ваши сильные стороны и точки роста
            </h1>
            <p className="mt-1 text-body text-secondary">
              Сопоставляем отмеченные навыки с {s.total} навыками выбранной
              профессии.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button
              variant="primary"
              className="w-full sm:w-auto"
              onClick={() => void handleExportPdf()}
              isLoading={exportPending}
              disabled={!user.targetProfession}
            >
              ⇩ Экспорт PDF
            </Button>
            {exportError && (
              <p className="text-helper text-danger">{exportError}</p>
            )}
          </div>
        </div>

        {/* KPI */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-helper text-secondary">Цель пройдена</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-text">
              {s.percent}%
            </p>
            <p className="mt-1 text-helper font-medium text-success">
              {s.mastered} из {s.total} навыков освоено
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-helper text-secondary">В процессе</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-text">
              {s.inProgress} {pluralSkills(s.inProgress)}
            </p>
            <p className="mt-1 line-clamp-2 text-helper text-secondary">
              {s.inProgressTitles.length > 0
                ? s.inProgressTitles.join(', ')
                : 'Активных навыков пока нет'}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-helper text-secondary">Ещё не начато</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-text">
              {s.notStarted} {pluralSkills(s.notStarted)}
            </p>
            <p className="mt-1 text-helper text-secondary">
              Осталось {s.hoursLeft} ч с учётом начатого
            </p>
          </div>
        </div>

        {/* Segmented progress */}
        <div className="mt-5 rounded-2xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-body font-semibold text-text">
                {s.professionTitle}
                {levelLabel ? ` · ${levelLabel}` : ''}
              </p>
              <p className="mt-0.5 text-helper text-secondary">
                Освоено {s.percent}% · В процессе{' '}
                {Math.round((s.inProgress / s.total) * 100)}% · Ещё не начато{' '}
                {Math.round((s.notStarted / s.total) * 100)}%
              </p>
            </div>
            {focus ? (
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-helper font-medium text-accent">
                Следующий шаг: {focus.title}
              </span>
            ) : (
              <span className="rounded-full bg-success-soft px-2.5 py-1 text-helper font-medium text-success">
                Все навыки освоены
              </span>
            )}
          </div>
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-border">
            <div
              className="bg-success transition-all"
              style={{ width: `${masteredPct}%` }}
            />
            <div
              className="bg-accent transition-all"
              style={{ width: `${progressPct}%` }}
            />
            <div
              className="bg-page transition-all"
              style={{ width: `${notStartedPct}%` }}
            />
          </div>
        </div>

        {/* Table + side */}
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_280px]">
          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-section text-text">Что осталось до цели</h2>
                <p className="mt-0.5 text-helper text-secondary">
                  Сначала — навыки, которые открывают больше следующих шагов.
                </p>
              </div>
              <span className="rounded-full bg-page px-2.5 py-1 text-helper text-secondary">
                {rows.length} {pluralSkills(rows.length)}
              </span>
            </div>

            {/* Table header */}
            <div className="mt-5 hidden grid-cols-[1fr_120px_100px_80px] gap-2 border-b border-border pb-2 text-[11px] font-semibold uppercase tracking-wider text-secondary sm:grid">
              <span>Навык</span>
              <span>Статус</span>
              <span>Приоритет</span>
              <span className="text-right">Осталось</span>
            </div>

            <ul>
              {visible.map((row) => {
                const st = STATUS_UI[row.status];
                const pr = PRIORITY_UI[row.priority];
                return (
                  <li
                    key={row.id}
                    className="grid grid-cols-1 gap-2 border-b border-border py-3.5 last:border-b-0 sm:grid-cols-[1fr_120px_100px_80px] sm:items-center sm:gap-2"
                  >
                    <p className="min-w-0 text-body font-medium text-text">
                      {row.title}
                      {row.locked ? (
                        <span className="ml-2 text-helper text-secondary">
                          зависит от предыдущих
                        </span>
                      ) : null}
                    </p>
                    <span
                      className={cn(
                        'inline-flex w-fit justify-self-start whitespace-nowrap rounded-full px-2.5 py-1 text-helper font-medium',
                        st.className
                      )}
                    >
                      {st.label}
                    </span>
                    <span
                      className={cn(
                        'whitespace-nowrap text-helper font-medium',
                        pr.className
                      )}
                    >
                      {pr.label}
                    </span>
                    <span className="whitespace-nowrap text-helper font-medium text-secondary sm:text-right">
                      {row.hoursLeft} ч
                    </span>
                  </li>
                );
              })}
            </ul>

            {rows.length === 0 ? (
              <p className="py-6 text-body text-secondary">
                Все навыки профессии освоены — пробелов не осталось.
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              {!showAll && hiddenCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="text-helper font-medium text-accent hover:underline"
                >
                  Ещё {hiddenCount} {pluralSkills(hiddenCount)} ↓
                </button>
              ) : showAll ? (
                <button
                  type="button"
                  onClick={() => setShowAll(false)}
                  className="text-helper font-medium text-accent hover:underline"
                >
                  Свернуть ↑
                </button>
              ) : (
                <span />
              )}
              <span className="text-helper text-secondary">
                {listedHours} ч · Всего осталось {s.hoursLeft} ч
              </span>
            </div>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            {/* Foundation */}
            <div className="rounded-2xl border border-border bg-surface p-5">
              <h3 className="text-section text-text">
                Ваша опора · {s.mastered} {pluralSkills(s.mastered)}
              </h3>
              <p className="mt-1 text-helper text-secondary">
                Эту базу уже можно применять в проектах.
              </p>
              {s.masteredTitles.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {s.masteredTitles.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-helper font-medium text-success"
                    >
                      <span>✓</span> {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-helper text-secondary">
                  Пока ни один навык не отмечен как освоенный.{' '}
                  <Link href="/map" className="text-accent hover:underline">
                    Отметить на карте
                  </Link>
                </p>
              )}
            </div>

            {/* Focus */}
            <div className="rounded-2xl border border-accent/15 bg-accent-soft/50 p-5">
              <div className="flex items-center gap-2">
                <span className="text-lg text-accent">◎</span>
                <h3 className="text-section text-text">Главный фокус</h3>
              </div>
              {focus ? (
                <>
                  <p className="mt-3 text-body font-semibold text-text">
                    {focus.title}
                  </p>
                  <p className="mt-1.5 text-helper leading-relaxed text-secondary">
                    Ближайший шаг в графе навыков: около {focus.hoursLeft} ч. Он
                    открывает следующие зависимости профессии.
                  </p>
                  <Link href="/trajectory" className="mt-4 block">
                    <Button variant="primary" className="w-full">
                      → Перейти к траектории
                    </Button>
                  </Link>
                </>
              ) : (
                <p className="mt-3 text-helper leading-relaxed text-secondary">
                  Все навыки профессии освоены — можно обновить цель в каталоге.
                </p>
              )}
            </div>
          </aside>
        </div>

        <p className="mt-6 flex items-start gap-2 text-helper text-secondary">
          <span>📄</span>
          В PDF: текущая цель, прогресс, список освоенных и недостающих навыков,
          приоритеты и оценка времени.
        </p>
        </div>
      </AppShell>
      {exportPayload && <PrintablePdfReport payload={exportPayload} />}
    </>
  );
}
