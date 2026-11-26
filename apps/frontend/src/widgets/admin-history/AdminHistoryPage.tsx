'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { AdminShell } from '@/widgets/admin-shell';
import { Button } from '@/shared/ui/button/Button';
import { cn } from '@/shared/lib/cn';
import { useSessionUser } from '@/features/auth';
import {
  EMPTY_HISTORY_FILTERS,
  useAdminHistory,
} from '@/features/admin-history';
import {
  ADMIN_ACTION_LABELS,
  ADMIN_ENTITY_LABELS,
  ADMIN_ENTITY_OPTIONS,
  eventActorName,
  eventTone,
  formatEventClock,
  formatEventDay,
  type AdminEvent,
  type EventTone,
} from '@/entities/admin-event';
import { USER_ROLE_LABELS, type UserRole } from '@/entities/user';

const TONE_CLASSES: Record<EventTone, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-[#FFF8E8] text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-page text-secondary',
};

const ACTION_OPTIONS = (
  Object.keys(ADMIN_ACTION_LABELS) as (keyof typeof ADMIN_ACTION_LABELS)[]
).map((value) => ({ value, label: ADMIN_ACTION_LABELS[value] }));

const selectClass =
  'h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text';

type DayGroup = { day: string; events: AdminEvent[] };

function groupByDay(events: AdminEvent[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const event of events) {
    const day = formatEventDay(event.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.events.push(event);
    else groups.push({ day, events: [event] });
  }
  return groups;
}

function HistoryRow({ event }: { event: AdminEvent }) {
  return (
    <li className="flex flex-wrap items-start gap-3 border-b border-border/70 px-4 py-3 last:border-0">
      <span className="w-12 shrink-0 pt-0.5 text-xs tabular-nums text-secondary">
        {formatEventClock(event.createdAt)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text">{event.title}</p>
        {event.detail && (
          <p className="mt-0.5 text-xs text-secondary">{event.detail}</p>
        )}
        <p className="mt-1 text-xs text-secondary">{eventActorName(event)}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <span className="rounded-full border border-border bg-page px-2.5 py-0.5 text-xs font-medium text-secondary">
          {ADMIN_ENTITY_LABELS[event.entityType]}
        </span>
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-xs font-medium',
            TONE_CLASSES[eventTone(event.action)]
          )}
        >
          {ADMIN_ACTION_LABELS[event.action]}
        </span>
      </div>
    </li>
  );
}

export function AdminHistoryPage() {
  const {
    professions,
    items,
    total,
    offset,
    limit,
    filters,
    loading,
    error,
    setFilter,
    setOffset,
    resetFilters,
    reload,
  } = useAdminHistory();
  const { user } = useSessionUser();

  const groups = useMemo(() => groupByDay(items), [items]);
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);
  const hasFilters =
    filters.professionId !== EMPTY_HISTORY_FILTERS.professionId ||
    filters.entityType !== EMPTY_HISTORY_FILTERS.entityType ||
    filters.action !== EMPTY_HISTORY_FILTERS.action;

  const selectedProfession = professions.find(
    (item) => item.id === filters.professionId
  );
  const professionLabel = selectedProfession?.title ?? 'Все профессии';

  return (
    <AdminShell
      breadcrumb={['Редакторская', 'История изменений']}
      saveStatus={loading ? 'Загрузка…' : `Записей: ${total}`}
      onReload={() => void reload()}
      user={
        user
          ? { name: user.name, role: USER_ROLE_LABELS[user.role as UserRole] }
          : null
      }
    >
      <div className="mx-auto max-w-[1120px] px-4 py-8 sm:px-6">
        {error && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/20 bg-danger-soft px-4 py-2.5 text-xs text-danger">
            <span>{error}</span>
            <Button variant="secondary" size="sm" onClick={() => void reload()}>
              Повторить
            </Button>
          </div>
        )}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-accent">
              Редакторская · Журнал
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-text">
              История изменений
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-secondary">
              Кто, что и когда менял в контенте: навыки, связи, ресурсы и
              публикации.
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex h-10 shrink-0 items-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text hover:bg-page"
          >
            К обзору
          </Link>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="min-w-[180px] flex-1">
            <span className="mb-1.5 block text-xs font-medium text-secondary">
              Профессия
            </span>
            <select
              value={filters.professionId}
              onChange={(event) =>
                setFilter('professionId', event.target.value)
              }
              className={selectClass}
            >
              <option value="">Все профессии</option>
              {professions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[150px]">
            <span className="mb-1.5 block text-xs font-medium text-secondary">
              Тип сущности
            </span>
            <select
              value={filters.entityType}
              onChange={(event) =>
                setFilter(
                  'entityType',
                  event.target.value as typeof filters.entityType
                )
              }
              className={selectClass}
            >
              <option value="">Любой</option>
              {ADMIN_ENTITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[150px]">
            <span className="mb-1.5 block text-xs font-medium text-secondary">
              Действие
            </span>
            <select
              value={filters.action}
              onChange={(event) =>
                setFilter('action', event.target.value as typeof filters.action)
              }
              className={selectClass}
            >
              <option value="">Любое</option>
              {ACTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {hasFilters && (
            <Button variant="secondary" size="sm" onClick={resetFilters}>
              Сбросить
            </Button>
          )}
        </div>

        <p className="mb-3 text-xs text-secondary">
          {professionLabel} · показано {from}–{to} из {total}
        </p>

        {loading && items.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-sm text-secondary shadow-[var(--shadow-soft)]">
            Загружаем журнал…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)]">
            <p className="text-base font-semibold text-text">
              Записей нет
            </p>
            <p className="mt-1 max-w-xl text-sm text-secondary">
              {hasFilters
                ? 'Под выбранные фильтры ничего не подходит — попробуйте сбросить их.'
                : 'Журнал заполнится, когда редакторы начнут менять контент профессий.'}
            </p>
          </div>
        ) : (
          <div
            className={cn(
              'overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-soft)]',
              loading && 'opacity-60'
            )}
          >
            {groups.map((group) => (
              <section key={group.day}>
                <h2 className="border-b border-border bg-page px-4 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-secondary">
                  {group.day}
                </h2>
                <ul>
                  {group.events.map((event) => (
                    <HistoryRow key={event.id} event={event} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {total > limit && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <Button
              variant="secondary"
              size="sm"
              disabled={offset === 0 || loading}
              onClick={() => setOffset(Math.max(offset - limit, 0))}
            >
              Назад
            </Button>
            <span className="text-xs text-secondary">
              {from}–{to} из {total}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={to >= total || loading}
              onClick={() => setOffset(offset + limit)}
            >
              Вперёд
            </Button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
