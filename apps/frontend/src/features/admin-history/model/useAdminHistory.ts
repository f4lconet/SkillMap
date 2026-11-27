'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/shared/api';
import { authApi } from '@/features/auth';
import { adminGraphApi, type AdminProfession } from '@/entities/admin-graph';
import { adminOverviewApi } from '@/entities/admin-overview';
import {
  adminEventApi,
  type AdminAction,
  type AdminEditor,
  type AdminEntityType,
  type AdminEvent,
  type AdminEventListParams,
} from '@/entities/admin-event';

const AUTH_REDIRECT = '/auth';
const FORBIDDEN =
  'Недостаточно прав: раздел доступен только редакторам. Войдите под аккаунтом редактора.';
const LOAD_ERROR =
  'Не удалось загрузить историю изменений. Проверьте соединение и попробуйте снова.';
const EXPORT_ERROR = 'Не удалось выгрузить журнал. Попробуйте ещё раз.';
const PAGE_SIZE = 30;

export type HistoryPeriod = '7d' | '30d' | 'all';

export type HistoryFilters = {
  professionId: string;
  entityType: AdminEntityType | '';
  action: AdminAction | '';
  actorId: string;
  q: string;
  period: HistoryPeriod;
};

export const EMPTY_HISTORY_FILTERS: HistoryFilters = {
  professionId: '',
  entityType: '',
  action: '',
  actorId: '',
  q: '',
  period: '7d',
};

/** Данные карточки публикации в шапке — из `GET /admin/overview`. */
export type HistoryPublication = {
  title: string;
  contentVersion: number;
  publishedAt: string | null;
  draftSavedAt: string | null;
  hasUnpublishedChanges: boolean;
};

export interface AdminHistoryState {
  professions: AdminProfession[];
  editors: AdminEditor[];
  publication: HistoryPublication | null;
  items: AdminEvent[];
  total: number;
  offset: number;
  limit: number;
  filters: HistoryFilters;
  loading: boolean;
  exporting: boolean;
  error: string | null;
  setFilter: <K extends keyof HistoryFilters>(
    key: K,
    value: HistoryFilters[K]
  ) => void;
  setOffset: (offset: number) => void;
  resetFilters: () => void;
  exportCsv: () => Promise<boolean>;
  reload: () => Promise<void>;
}

function describeError(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    if (error.status === 403) return FORBIDDEN;
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** Период из селекта → начало диапазона для API (`createdFrom`). */
function periodStart(period: HistoryPeriod): string | undefined {
  if (period === 'all') return undefined;
  const from = new Date();
  from.setDate(from.getDate() - (period === '30d' ? 30 : 7));
  return from.toISOString();
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function useAdminHistory(): AdminHistoryState {
  const router = useRouter();

  const [professions, setProfessions] = useState<AdminProfession[]>([]);
  const [editors, setEditors] = useState<AdminEditor[]>([]);
  const [publication, setPublication] = useState<HistoryPublication | null>(null);
  const [items, setItems] = useState<AdminEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState<HistoryFilters>(EMPTY_HISTORY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useRef(0);

  const redirectIfUnauthorized = useCallback(
    (err: unknown): boolean => {
      if (err instanceof ApiClientError && err.status === 401) {
        router.replace(AUTH_REDIRECT);
        return true;
      }
      return false;
    },
    [router]
  );

  // Все фильтры обслуживает бэкенд: профессия, тип, действие, автор, поиск, период.
  // Границы периода считаем в момент запроса, а не на рендере (иначе ломается пререндер).
  const buildParams = useCallback(
    (): AdminEventListParams => ({
      professionId: filters.professionId || undefined,
      entityType: filters.entityType || undefined,
      action: filters.action || undefined,
      actorId: filters.actorId || undefined,
      q: filters.q.trim() || undefined,
      createdFrom: periodStart(filters.period),
    }),
    [filters]
  );

  const loadProfessions = useCallback(async () => {
    if (!authApi.getAccessToken()) {
      router.replace(AUTH_REDIRECT);
      return;
    }
    try {
      const data = await adminGraphApi.listProfessions({ limit: 200 });
      setProfessions(data.items);
    } catch (err) {
      if (redirectIfUnauthorized(err)) return;
      setError(describeError(err, LOAD_ERROR));
    }
  }, [redirectIfUnauthorized, router]);

  const loadEditors = useCallback(async () => {
    try {
      const data = await adminEventApi.listEditors();
      setEditors(data.items.filter((editor) => editor.actorId !== null));
    } catch (err) {
      if (redirectIfUnauthorized(err)) return;
      setEditors([]);
    }
  }, [redirectIfUnauthorized]);

  const loadPublication = useCallback(async () => {
    try {
      const data = await adminOverviewApi.get({
        professionId: filters.professionId || undefined,
        recentLimit: 0,
      });
      const profession = data.profession;
      setPublication(
        profession
          ? {
              title: profession.title,
              contentVersion: profession.contentVersion,
              publishedAt: profession.publishedAt,
              draftSavedAt: profession.draftSavedAt,
              hasUnpublishedChanges: data.hasUnpublishedChanges,
            }
          : null
      );
    } catch (err) {
      if (redirectIfUnauthorized(err)) return;
      setPublication(null);
    }
  }, [filters.professionId, redirectIfUnauthorized]);

  const loadEvents = useCallback(async () => {
    const requestId = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const data = await adminEventApi.list({
        ...buildParams(),
        limit: PAGE_SIZE,
        offset,
      });
      if (requestId !== request.current) return;
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      if (requestId !== request.current) return;
      if (redirectIfUnauthorized(err)) return;
      setError(describeError(err, LOAD_ERROR));
    } finally {
      if (requestId === request.current) setLoading(false);
    }
  }, [buildParams, offset, redirectIfUnauthorized]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadProfessions();
    });
    return () => {
      cancelled = true;
    };
  }, [loadProfessions]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadEditors();
    });
    return () => {
      cancelled = true;
    };
  }, [loadEditors]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadPublication();
    });
    return () => {
      cancelled = true;
    };
  }, [loadPublication]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadEvents();
    });
    return () => {
      cancelled = true;
    };
  }, [loadEvents]);

  const setFilter = useCallback(
    <K extends keyof HistoryFilters>(key: K, value: HistoryFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setOffset(0);
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_HISTORY_FILTERS);
    setOffset(0);
  }, []);

  const exportCsv = useCallback(async (): Promise<boolean> => {
    setExporting(true);
    setError(null);
    try {
      const blob = await adminEventApi.exportCsv(buildParams());
      triggerDownload(
        blob,
        `skillmap-history-${new Date().toISOString().slice(0, 10)}.csv`
      );
      return true;
    } catch (err) {
      if (redirectIfUnauthorized(err)) return false;
      setError(describeError(err, EXPORT_ERROR));
      return false;
    } finally {
      setExporting(false);
    }
  }, [buildParams, redirectIfUnauthorized]);

  const reload = useCallback(async () => {
    await Promise.all([
      loadEvents(),
      loadProfessions(),
      loadEditors(),
      loadPublication(),
    ]);
  }, [loadEvents, loadProfessions, loadEditors, loadPublication]);

  return {
    professions,
    editors,
    publication,
    items,
    total,
    offset,
    limit: PAGE_SIZE,
    filters,
    loading,
    exporting,
    error,
    setFilter,
    setOffset,
    resetFilters,
    exportCsv,
    reload,
  };
}
