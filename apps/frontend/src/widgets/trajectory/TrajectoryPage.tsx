'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/widgets/app-shell';
import { Button } from '@/shared/ui';
import { USER_LEVEL_LABELS, type UserLevel } from '@/entities/user';
import { useTrajectoryData } from '@/features/trajectory/model/useTrajectoryData';
import { WeekCard } from '@/features/trajectory/ui/WeekCard';
import { NowPanel } from '@/features/trajectory/ui/NowPanel';

const VISIBLE_WEEKS = 4;

export function TrajectoryPage() {
  const {
    user,
    trajectory,
    gap,
    loading,
    error,
    reload,
    savingItemId,
    markError,
    toggleItem,
  } = useTrajectoryData();
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [showMore, setShowMore] = useState(false);

  const weeks = useMemo(() => trajectory?.weeks ?? [], [trajectory]);
  const currentWeekNumber = trajectory?.currentWeek ?? weeks[0]?.week ?? 1;
  const activeWeekNumber = expandedWeek ?? currentWeekNumber;
  const currentWeek =
    weeks.find((week) => week.week === currentWeekNumber) ?? weeks[0] ?? null;

  const visibleWeeks = useMemo(
    () => (showMore ? weeks : weeks.slice(0, VISIBLE_WEEKS)),
    [weeks, showMore]
  );

  const weekHours = currentWeek?.estimatedHours ?? trajectory?.hoursPerWeek ?? 0;
  const weekDoneHours = currentWeek
    ? currentWeek.items.reduce(
        (sum, item) => (item.status === 'done' ? sum + item.hours : sum),
        0
      )
    : 0;
  const remainingWeekHours = Math.max(0, weekHours - weekDoneHours);
  const remainingHours =
    gap?.estimatedRemainingHours ??
    weeks.reduce((sum, week) => sum + week.estimatedHours, 0);
  const goalProgress = gap?.progressPercent ?? 0;

  const levelLabel = trajectory?.level
    ? (USER_LEVEL_LABELS[trajectory.level as UserLevel] ?? trajectory.level)
    : null;

  const shellProps = {
    breadcrumb: ['Моё обучение', 'Траектория'],
    userName: user?.name,
    goalTitle: trajectory?.professionTitle ?? user?.targetProfession?.title,
    goalProgress,
    userLevel: levelLabel ?? undefined,
  };

  if (loading) {
    return (
      <AppShell {...shellProps}>
        <div className="mx-auto max-w-5xl px-4 py-16 text-center text-body text-secondary sm:px-6">
          Строим траекторию обучения…
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell {...shellProps}>
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
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
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <h1 className="text-h2 tracking-tight text-text">Траектория пока пуста</h1>
          <p className="mt-2 max-w-xl text-body leading-relaxed text-secondary">
            Выберите профессию и отметьте уже известные навыки — после этого
            появится план по неделям с ресурсами и ближайшими шагами.
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

  return (
    <AppShell {...shellProps}>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              {trajectory?.professionTitle}
              {levelLabel ? ` · ${levelLabel}` : ''}
            </p>
            <h1 className="mt-1 text-h2 tracking-tight text-text">
              От карты — к действиям
            </h1>
            <p className="mt-1 text-body text-secondary">
              {trajectory
                ? `Посильный план с учётом зависимостей и ваших ${trajectory.hoursPerWeek} часов в неделю.`
                : 'Посильный план с учётом зависимостей между навыками.'}
            </p>
          </div>
          <Link href="/profile">
            <Button variant="secondary" size="sm">
              ⚙ Настроить нагрузку
            </Button>
          </Link>
        </div>

        {markError && (
          <div className="mt-4 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-helper text-danger">
            {markError}
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-helper text-secondary">Темп обучения</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-text">
              {trajectory?.hoursPerWeek ?? 0} ч / нед.
            </p>
            <p className="mt-1 text-helper text-secondary">Можно менять в профиле</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-helper text-secondary">Осталось до цели</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-text">
              {remainingHours} ч
            </p>
            <p className="mt-1 text-helper text-secondary">
              {trajectory
                ? `План на ${trajectory.totalWeeks} ${weeksWord(trajectory.totalWeeks)}`
                : 'План ещё не построен'}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-helper text-secondary">На этой неделе</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-text">
              {weekDoneHours} / {weekHours} ч
            </p>
            <p
              className={
                remainingWeekHours > 0
                  ? 'mt-1 text-helper text-secondary'
                  : 'mt-1 text-helper font-medium text-success'
              }
            >
              {remainingWeekHours > 0
                ? `Ещё ${remainingWeekHours} ч по плану`
                : 'Неделя закрыта'}
            </p>
          </div>
        </div>

        {weeks.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6 text-body text-secondary">
            Все навыки профессии уже освоены — строить план не из чего. Отметьте
            прогресс на карте, если что-то изменилось.
            <Link href="/map" className="mt-3 block">
              <Button variant="secondary" size="sm">
                Открыть карту навыков
              </Button>
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_280px]">
            <div className="space-y-3">
              {visibleWeeks.map((week) => (
                <WeekCard
                  key={week.week}
                  week={week}
                  isCurrent={week.week === currentWeekNumber}
                  expanded={activeWeekNumber === week.week}
                  onToggle={() =>
                    setExpandedWeek((value) =>
                      (value ?? currentWeekNumber) === week.week ? -1 : week.week
                    )
                  }
                  onToggleItem={(itemId) => void toggleItem(itemId)}
                  savingItemId={savingItemId}
                />
              ))}

              {weeks.length > VISIBLE_WEEKS && (
                <button
                  type="button"
                  onClick={() => setShowMore((value) => !value)}
                  className="w-full cursor-pointer py-3 text-center text-helper font-medium text-accent transition-colors hover:underline"
                >
                  {showMore
                    ? 'Свернуть план ↑'
                    : `Показать все ${weeks.length} ${weeksWord(weeks.length)} ↓`}
                </button>
              )}
            </div>

            <aside className="lg:sticky lg:top-6 lg:self-start">
              <p className="mb-3 text-helper font-semibold text-secondary">
                Что делать сейчас
              </p>
              <NowPanel
                weekNumber={currentWeekNumber}
                weekHours={weekHours}
                items={trajectory?.whatToDoThisWeek ?? currentWeek?.items ?? []}
                remainingWeekHours={remainingWeekHours}
                onToggleItem={(itemId) => void toggleItem(itemId)}
                savingItemId={savingItemId}
              />
            </aside>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function weeksWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'неделю';
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'недели';
  return 'недель';
}
