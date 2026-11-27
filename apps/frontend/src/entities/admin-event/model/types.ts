/**
 * Журнал изменений контента (`GET /admin/history`).
 *
 * Строка пишется на каждую мутацию в админке, поэтому `entityId` не связан
 * внешним ключом: запись должна переживать удаление сущности.
 */

export type AdminEntityType =
  | 'profession'
  | 'skill'
  | 'dependency'
  | 'resource';

export type AdminAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'published'
  | 'checked';

export type AdminEvent = {
  id: string;
  createdAt: string;
  actorId: string | null;
  actorName: string;
  entityType: AdminEntityType;
  entityId: string | null;
  professionId: string | null;
  skillId: string | null;
  action: AdminAction;
  /** Короткий заголовок: «Добавлен навык», «Обновлён ресурс». */
  title: string;
  /** Подробности: что именно и в какой сущности изменилось. */
  detail: string;
};

export type AdminEventList = {
  items: AdminEvent[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminEventListParams = {
  professionId?: string;
  skillId?: string;
  entityType?: AdminEntityType;
  action?: AdminAction;
  /** Автор записи (см. `GET /admin/editors`). */
  actorId?: string;
  /** Поиск по заголовку, подробностям и автору. */
  q?: string;
  /** Начало периода (ISO), включительно. */
  createdFrom?: string;
  /** Конец периода (ISO), включительно. */
  createdTo?: string;
  limit?: number;
  offset?: number;
};

/** Автор записей журнала (`GET /admin/editors`) — вариант фильтра «Автор». */
export type AdminEditor = {
  actorId: string | null;
  actorName: string;
  eventsCount: number;
  lastEventAt: string | null;
};

export type AdminEditorList = {
  items: AdminEditor[];
  total: number;
};
