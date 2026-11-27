'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminShell } from '@/widgets/admin-shell';
import { Button } from '@/shared/ui/button/Button';
import { cn } from '@/shared/lib/cn';
import { useSessionUser } from '@/features/auth';
import {
  EMPTY_HISTORY_FILTERS,
  useAdminHistory,
  type HistoryPeriod,
} from '@/features/admin-history';
import {
  ADMIN_ACTION_LABELS,
  ADMIN_ENTITY_LABELS,
  ADMIN_ENTITY_OPTIONS,
  eventActorName,
  formatEventClock,
  formatEventDay,
  formatRelativeTime,
  type AdminAction,
  type AdminEvent,
} from '@/entities/admin-event';
import { USER_ROLE_LABELS, type UserRole } from '@/entities/user';

const selectClass =
  'h-11 w-full appearance-none rounded-lg border border-border bg-surface px-3 pr-8 text-sm text-text outline-none focus:border-accent focus:ring-[3px] focus:ring-[rgba(83,87,217,0.33)]';

const ACTION_OPTIONS = (Object.keys(ADMIN_ACTION_LABELS) as AdminAction[]).map(
  (value) => ({ value, label: ADMIN_ACTION_LABELS[value] })
);

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

function formatFullDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const day = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });
  const time = date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${day}, ${time}`;
}

function graphHref(event: AdminEvent): string {
  if (event.skillId) return `/admin/graph?skillId=${event.skillId}`;
  if (event.entityType === 'skill' && event.entityId) {
    return `/admin/graph?skillId=${event.entityId}`;
  }
  if (event.entityType === 'resource') return '/admin/resources';
  return '/admin/graph';
}

function EventDetailPanel({ event }: { event: AdminEvent | null }) {
  if (!event) {
    return (
      <div className="h-fit rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-soft)] sticky top-6">
        <h2 className="text-base font-semibold text-text">Детали изменения</h2>
        <p className="mt-3 text-sm text-secondary">
          Выберите событие в списке, чтобы увидеть подробности.
        </p>
      </div>
    );
  }

  const actor = eventActorName(event);
  const entityLabel = ADMIN_ENTITY_LABELS[event.entityType];
  const actionLabel = ADMIN_ACTION_LABELS[event.action];
  const isDraftish =
    event.action === 'created' ||
    event.action === 'updated' ||
    event.action === 'checked';

  return (
    <div className="h-fit rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-soft)] sticky top-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-text">Детали изменения</h2>
        {isDraftish && (
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
            Черновик
          </span>
        )}
        {event.action === 'published' && (
          <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
            Опубликовано
          </span>
        )}
      </div>

      <h3 className="text-lg font-semibold leading-snug text-text">
        {event.title}
      </h3>
      <p className="mt-1 text-xs text-secondary">
        {entityLabel}
        {event.professionId ? ' · в выбранной профессии' : ''}
      </p>

      <div className="mt-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
          {actor
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase() ?? '')
            .join('') || '·'}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text">
            {actor} · Редактор
          </p>
          <p className="text-xs text-secondary">
            {formatFullDateTime(event.createdAt)}
            {event.action === 'published' ? '' : ' · Рабочая версия'}
          </p>
        </div>
      </div>

      {event.detail && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-secondary">Изменение</p>
          <div className="rounded-lg border border-border bg-page px-3 py-2.5 text-sm text-text">
            {event.detail}
          </div>
        </div>
      )}

      <div className="mt-4">
        <p className="text-sm font-medium text-text">Тип события</p>
        <p className="mt-1 text-xs text-secondary">
          {actionLabel} · {entityLabel}
          {event.entityId ? ` · id ${event.entityId.slice(0, 8)}…` : ''}
        </p>
      </div>

      {event.action !== 'published' && (
        <div className="mt-5 rounded-lg border border-border bg-page p-3">
          <p className="text-xs font-semibold text-text">Ещё не опубликовано</p>
          <p className="mt-1 text-xs text-secondary">
            Изменение попадёт в карту студентов после публикации рабочей версии.
          </p>
        </div>
      )}

      <Link
        href={graphHref(event)}
        className="mt-5 flex h-11 w-full items-center justify-center rounded-lg bg-accent text-sm font-semibold text-white hover:bg-[#4448C4]"
      >
        {event.entityType === 'resource'
          ? 'Открыть ресурсы'
          : event.entityType === 'skill' || event.skillId
            ? 'Открыть навык в графе'
            : 'Открыть редактор графа'}
      </Link>

      <p className="mt-4 text-center text-xs text-secondary">
        Журнал хранит историю действий редакторов.
      </p>
    </div>
  );
}

export function AdminHistoryPage() {
  const {
    professions,
    editors,
    publication,
    items,
    total,
    offset,
    limit,
    filters,
    loading,
    exporting,
    error,
    setFilter,
    setOffset,
    resetFilters,
    exportCsv,
    reload,
  } = useAdminHistory();
  const { user } = useSessionUser();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Поиск по журналу выполняет бэкенд — отправляем запрос с небольшой задержкой.
  useEffect(() => {
    const next = searchQuery.trim();
    if (next === filters.q) return;
    const timer = window.setTimeout(() => setFilter('q', next), 350);
    return () => window.clearTimeout(timer);
  }, [searchQuery, filters.q, setFilter]);

  const groups = useMemo(() => groupByDay(items), [items]);

  // Автовыбор первого события при смене списка
  const effectiveSelectedId = useMemo(() => {
    if (selectedId && items.some((e) => e.id === selectedId)) {
      return selectedId;
    }
    return items[0]?.id ?? null;
  }, [items, selectedId]);

  const selectedEvent =
    items.find((e) => e.id === effectiveSelectedId) ?? null;

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);
  const hasFilters =
    filters.professionId !== '' ||
    filters.entityType !== '' ||
    filters.action !== '' ||
    filters.actorId !== '' ||
    filters.q !== '' ||
    filters.period !== EMPTY_HISTORY_FILTERS.period;

  const selectedProfession = professions.find(
    (item) => item.id === filters.professionId
  );
  const professionLabel = selectedProfession?.title ?? 'Все профессии';
  const levelLabel =
    selectedProfession?.entryLevel === 'beginner'
      ? 'Junior'
      : selectedProfession?.entryLevel === 'intermediate'
        ? 'Middle'
        : selectedProfession?.entryLevel === 'advanced'
          ? 'Senior'
          : null;

  const pageCount = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;
  const pageWindow = useMemo(() => {
    const size = Math.min(5, pageCount);
    const start = Math.min(
      Math.max(1, currentPage - Math.floor(size / 2)),
      Math.max(1, pageCount - size + 1)
    );
    return Array.from({ length: size }, (_, i) => start + i);
  }, [currentPage, pageCount]);

  const publicationTitle = publication
    ? `${publication.title} · версия ${publication.contentVersion}`
    : null;
  const publicationBadge = publication
    ? publication.hasUnpublishedChanges
      ? 'Есть черновик'
      : 'Опубликовано'
    : null;
  const versionTitle = publication?.publishedAt
    ? `Опубликовано ${formatFullDateTime(publication.publishedAt)}`
    : 'Версия ещё не публиковалась';
  const saveStatus = loading
    ? 'Загрузка…'
    : publication?.draftSavedAt
      ? `Черновик сохранён ${formatRelativeTime(publication.draftSavedAt)}`
      : 'Журнал актуален';

  return (
    <AdminShell
      breadcrumb={['Редакторская', 'История изменений']}
      saveStatus={saveStatus}
      onReload={() => void reload()}
      publication={
        publicationTitle && publicationBadge
          ? {
              title: publicationTitle,
              badge: publicationBadge,
              tone: publication?.hasUnpublishedChanges ? 'warning' : 'success',
            }
          : undefined
      }
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

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-accent">
              Редакторская · Журнал событий
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-text">
              История изменений
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-secondary">
              Кто, когда и что изменил в карте профессии и учебных материалах.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void exportCsv()}
            disabled={exporting}
            className="inline-flex h-10 shrink-0 items-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text hover:bg-page disabled:cursor-not-allowed disabled:opacity-60"
            title="Скачать текущую выборку журнала в CSV"
          >
            {exporting ? 'Готовим CSV…' : 'Экспорт журнала'}
          </button>
        </div>

        {/* Filters — layout как на макете */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-secondary">
              Поиск
            </label>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Навык, ресурс или версия"
              className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text placeholder:text-secondary outline-none focus:border-accent focus:ring-[3px] focus:ring-[rgba(83,87,217,0.33)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-secondary">
              Тип события
            </label>
            <div className="relative">
              <select
                value={filters.entityType}
                onChange={(e) =>
                  setFilter(
                    'entityType',
                    e.target.value as typeof filters.entityType
                  )
                }
                className={selectClass}
              >
                <option value="">Все события</option>
                {ADMIN_ENTITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary text-xs">
                ▾
              </span>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-secondary">
              Автор
            </label>
            <div className="relative">
              <select
                value={filters.actorId}
                onChange={(e) => setFilter('actorId', e.target.value)}
                className={selectClass}
              >
                <option value="">Все редакторы</option>
                {editors.map((editor) => (
                  <option key={editor.actorId} value={editor.actorId ?? ''}>
                    {editor.actorName} ({editor.eventsCount})
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary text-xs">
                ▾
              </span>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-secondary">
              Период
            </label>
            <div className="relative">
              <select
                value={filters.period}
                onChange={(e) =>
                  setFilter('period', e.target.value as HistoryPeriod)
                }
                className={selectClass}
              >
                <option value="7d">Последние 7 дней</option>
                <option value="30d">Последние 30 дней</option>
                <option value="all">Всё время</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary text-xs">
                ▾
              </span>
            </div>
          </div>
        </div>

        {/* Профессия (реальный фильтр API) + сброс */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium text-text">
              {professionLabel}
              {levelLabel ? ` / ${levelLabel}` : ''}
              {' · '}
              {total}{' '}
              {total === 1 ? 'событие' : total < 5 ? 'события' : 'событий'}
            </p>
            <div className="relative min-w-[180px]">
              <select
                value={filters.professionId}
                onChange={(e) => setFilter('professionId', e.target.value)}
                className="h-9 w-full appearance-none rounded-lg border border-border bg-surface px-3 pr-7 text-xs text-text outline-none focus:border-accent"
                title="Фильтр по профессии"
              >
                <option value="">Все профессии</option>
                {professions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative min-w-[160px]">
              <select
                value={filters.action}
                onChange={(e) =>
                  setFilter('action', e.target.value as typeof filters.action)
                }
                className="h-9 w-full appearance-none rounded-lg border border-border bg-surface px-3 pr-7 text-xs text-text outline-none focus:border-accent"
                title="Фильтр по действию"
              >
                <option value="">Все действия</option>
                {ACTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent"
              title={versionTitle}
            >
              {publication
                ? `Рабочая версия ${publication.contentVersion}`
                : 'Версия не выбрана'}
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  resetFilters();
                  setSearchQuery('');
                }}
                className="text-xs font-medium text-accent hover:underline"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        </div>

        {/* List + detail */}
        {loading && items.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-sm text-secondary shadow-[var(--shadow-soft)]">
            Загружаем журнал…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)]">
            <p className="text-base font-semibold text-text">Записей нет</p>
            <p className="mt-1 max-w-xl text-sm text-secondary">
              {hasFilters
                ? 'Под выбранные фильтры ничего не подходит — попробуйте сбросить их.'
                : 'Журнал заполнится, когда редакторы начнут менять контент профессий.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
            {/* Event list */}
            <div
              className={cn(
                'overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-soft)]',
                loading && 'opacity-60'
              )}
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-base font-semibold text-text">Все события</h2>
                <span className="text-xs text-secondary">Сначала новые</span>
              </div>

              <div className="px-2 py-2">
                {groups.length === 0 ? (
                  <p className="px-3 py-6 text-sm text-secondary">
                    По фильтрам ничего не найдено.
                  </p>
                ) : (
                  groups.map((group) => (
                    <div key={group.day} className="mb-1">
                      <p className="px-3 py-2 text-xs font-medium text-secondary">
                        {group.day}
                      </p>
                      <ul>
                        {group.events.map((event) => {
                          const active = event.id === effectiveSelectedId;
                          return (
                            <li key={event.id}>
                              <button
                                type="button"
                                onClick={() => setSelectedId(event.id)}
                                className={cn(
                                  'flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors',
                                  active
                                    ? 'bg-accent-soft'
                                    : 'hover:bg-page'
                                )}
                              >
                                <span className="w-10 shrink-0 pt-0.5 text-xs tabular-nums text-secondary">
                                  {formatEventClock(event.createdAt)}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p
                                    className={cn(
                                      'text-sm font-medium',
                                      active ? 'text-accent' : 'text-text'
                                    )}
                                  >
                                    {event.title}
                                  </p>
                                  {event.detail && (
                                    <p className="mt-0.5 line-clamp-2 text-xs text-secondary">
                                      {event.detail}
                                    </p>
                                  )}
                                  <p className="mt-0.5 text-xs text-secondary">
                                    {eventActorName(event)} · Редактор
                                  </p>
                                </div>
                                <span className="shrink-0 rounded-full border border-border bg-page px-2.5 py-0.5 text-xs font-medium text-secondary">
                                  {ADMIN_ENTITY_LABELS[event.entityType]}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
                <span className="text-sm text-secondary">
                  {from}–{to} из {total} событий
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1 || loading}
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    className="mr-1 flex h-8 items-center rounded-lg border border-border px-3 text-sm font-medium text-text hover:bg-page disabled:opacity-40"
                  >
                    Назад
                  </button>
                  {pageWindow.map((page) => {
                    const pageOffset = (page - 1) * limit;
                    const isActive = page === currentPage;
                    return (
                      <button
                        key={page}
                        type="button"
                        disabled={loading}
                        onClick={() => setOffset(pageOffset)}
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium',
                          isActive
                            ? 'bg-accent-soft text-accent'
                            : 'text-secondary hover:bg-page'
                        )}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    disabled={to >= total || loading}
                    onClick={() => setOffset(offset + limit)}
                    className="ml-1 flex h-8 items-center rounded-lg border border-border px-3 text-sm font-medium text-text hover:bg-page disabled:opacity-40"
                  >
                    Далее
                  </button>
                </div>
              </div>
            </div>

            <EventDetailPanel event={selectedEvent} />
          </div>
        )}

        <p className="mt-6 text-center text-xs text-secondary">
          В журнале отображаются изменения графа, ресурсов и публикаций.
          {selectedProfession
            ? ` Профессия: ${selectedProfession.title}.`
            : ''}
        </p>
      </div>
    </AdminShell>
  );
}
