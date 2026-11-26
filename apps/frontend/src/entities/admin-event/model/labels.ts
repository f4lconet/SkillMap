import type {
  AdminAction,
  AdminEntityType,
  AdminEvent,
} from './types';

export const ADMIN_ENTITY_LABELS: Record<AdminEntityType, string> = {
  profession: 'Профессия',
  skill: 'Навык',
  dependency: 'Связь',
  resource: 'Ресурс',
};

export const ADMIN_ENTITY_OPTIONS = (
  Object.keys(ADMIN_ENTITY_LABELS) as AdminEntityType[]
).map((value) => ({ value, label: ADMIN_ENTITY_LABELS[value] }));

export const ADMIN_ACTION_LABELS: Record<AdminAction, string> = {
  created: 'Добавление',
  updated: 'Изменение',
  deleted: 'Удаление',
  published: 'Публикация',
  checked: 'Проверка',
};

export type EventTone = 'success' | 'warning' | 'danger' | 'neutral';

export function eventTone(action: AdminAction): EventTone {
  if (action === 'deleted') return 'danger';
  if (action === 'published' || action === 'checked') return 'success';
  if (action === 'created') return 'warning';
  return 'neutral';
}

/** «5 минут назад», «вчера в 12:40», иначе дата. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';

  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;

  const hours = Math.round(minutes / 60);
  if (hours < 24 && now.getDate() === date.getDate()) return `${hours} ч назад`;

  const time = date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (yesterday.toDateString() === date.toDateString()) {
    return `вчера в ${time}`;
  }

  return `${date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  })}, ${time}`;
}

/** Время для узкой колонки в ленте: «12:40» для сегодняшних записей, иначе дата. */
export function formatEventClock(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

/** Заголовок дня для группировки журнала: «22 октября 2026». */
export function formatEventDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function eventActorName(event: AdminEvent): string {
  return event.actorName || 'Система';
}
