'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/shared/api';
import { authApi } from '@/features/auth';
import { adminGraphApi, type AdminProfession } from '@/entities/admin-graph';
import {
  adminEventApi,
  type AdminAction,
  type AdminEntityType,
  type AdminEvent,
} from '@/entities/admin-event';

const AUTH_REDIRECT = '/auth';
const FORBIDDEN =
  'Недостаточно прав: раздел доступен только редакторам. Войдите под аккаунтом редактора.';
const LOAD_ERROR =
  'Не удалось загрузить историю изменений. Проверьте соединение и попробуйте снова.';
const PAGE_SIZE = 30;

export type HistoryFilters = {
  professionId: string;
  entityType: AdminEntityType | '';
  action: AdminAction | '';
};

export const EMPTY_HISTORY_FILTERS: HistoryFilters = {
  professionId: '',
  entityType: '',
  action: '',
};

export interface AdminHistoryState {
  professions: AdminProfession[];
  items: AdminEvent[];
  total: number;
  offset: number;
  limit: number;
  filters: HistoryFilters;
  loading: boolean;
  error: string | null;
  setFilter: <K extends keyof HistoryFilters>(
    key: K,
    value: HistoryFilters[K]
  ) => void;
  setOffset: (offset: number) => void;
  resetFilters: () => void;
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

export function useAdminHistory(): AdminHistoryState {
  const router = useRouter();

  const [professions, setProfessions] = useState<AdminProfession[]>([]);
  const [items, setItems] = useState<AdminEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState<HistoryFilters>(EMPTY_HISTORY_FILTERS);
  const [loading, setLoading] = useState(true);
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

  // Бэкенд фильтрует журнал по профессии, навыку, типу сущности и действию.
  const loadEvents = useCallback(async () => {
    const requestId = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const data = await adminEventApi.list({
        professionId: filters.professionId || undefined,
        entityType: filters.entityType || undefined,
        action: filters.action || undefined,
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
  }, [
    filters.professionId,
    filters.entityType,
    filters.action,
    offset,
    redirectIfUnauthorized,
  ]);

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

  const reload = useCallback(async () => {
    await Promise.all([loadEvents(), loadProfessions()]);
  }, [loadEvents, loadProfessions]);

  return {
    professions,
    items,
    total,
    offset,
    limit: PAGE_SIZE,
    filters,
    loading,
    error,
    setFilter,
    setOffset,
    resetFilters,
    reload,
  };
}
