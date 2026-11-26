'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/shared/api';
import { authApi } from '@/features/auth';
import {
  adminGraphApi,
  type AdminProfession,
} from '@/entities/admin-graph';
import {
  adminOverviewApi,
  type AdminOverview,
} from '@/entities/admin-overview';

const AUTH_REDIRECT = '/auth';
const FORBIDDEN =
  'Недостаточно прав: раздел доступен только редакторам. Войдите под аккаунтом редактора.';
const LOAD_ERROR =
  'Не удалось загрузить сводку. Проверьте соединение и попробуйте снова.';
const ACTION_ERROR = 'Не удалось выполнить действие. Попробуйте ещё раз.';
const RECENT_LIMIT = 6;

export type OverviewToast = { message: string; tone: 'success' | 'error' };

export interface AdminOverviewState {
  professions: AdminProfession[];
  /** Выбранная профессия; `null` — бэкенд подставит приоритетную. */
  selectedProfessionId: string | null;
  selectedProfession: AdminProfession | null;
  overview: AdminOverview | null;
  loading: boolean;
  refreshing: boolean;
  publishing: boolean;
  error: string | null;
  toast: OverviewToast | null;
  selectProfession: (id: string) => void;
  reload: () => Promise<void>;
  publish: () => Promise<boolean>;
  dismissToast: () => void;
}

function describeError(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    if (error.status === 403) return FORBIDDEN;
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function useAdminOverview(): AdminOverviewState {
  const router = useRouter();

  const [professions, setProfessions] = useState<AdminProfession[]>([]);
  const [selectedProfessionId, setSelectedProfessionId] = useState<
    string | null
  >(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<OverviewToast | null>(null);

  const toastTimer = useRef<number | null>(null);
  const request = useRef(0);

  const dismissToast = useCallback(() => {
    if (toastTimer.current !== null) {
      window.clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback((message: string, tone: 'success' | 'error') => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    setToast({ message, tone });
    toastTimer.current = window.setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 3800);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    },
    []
  );

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

  const loadOverview = useCallback(
    async (professionId: string | null, isRefresh: boolean) => {
      const requestId = ++request.current;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await adminOverviewApi.get({
          professionId: professionId ?? undefined,
          recentLimit: RECENT_LIMIT,
        });
        if (requestId !== request.current) return;
        setOverview(data);
      } catch (err) {
        if (requestId !== request.current) return;
        if (redirectIfUnauthorized(err)) return;
        setError(describeError(err, LOAD_ERROR));
      } finally {
        if (requestId === request.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [redirectIfUnauthorized]
  );

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
      if (!cancelled) void loadOverview(selectedProfessionId, false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadOverview, selectedProfessionId]);

  const reload = useCallback(async () => {
    await Promise.all([
      loadOverview(selectedProfessionId, true),
      loadProfessions(),
    ]);
  }, [loadOverview, loadProfessions, selectedProfessionId]);

  const selectProfession = useCallback((id: string) => {
    setSelectedProfessionId(id);
  }, []);

  const publish = useCallback(async (): Promise<boolean> => {
    const professionId = selectedProfessionId ?? overview?.profession?.id;
    if (!professionId) {
      showToast('Профессия не выбрана', 'error');
      return false;
    }
    setPublishing(true);
    try {
      await adminGraphApi.publish(professionId);
      showToast('Изменения опубликованы — студенты видят новую версию', 'success');
      await reload();
      return true;
    } catch (err) {
      if (redirectIfUnauthorized(err)) return false;
      showToast(describeError(err, ACTION_ERROR), 'error');
      return false;
    } finally {
      setPublishing(false);
    }
  }, [
    overview?.profession?.id,
    redirectIfUnauthorized,
    reload,
    selectedProfessionId,
    showToast,
  ]);

  const selectedProfession =
    professions.find((item) => item.id === selectedProfessionId) ??
    overview?.profession ??
    null;

  return {
    professions,
    selectedProfessionId: selectedProfession?.id ?? null,
    selectedProfession,
    overview,
    loading,
    refreshing,
    publishing,
    error,
    toast,
    selectProfession,
    reload,
    publish,
    dismissToast,
  };
}
