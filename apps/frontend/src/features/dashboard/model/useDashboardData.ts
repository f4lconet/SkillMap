'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/shared/api';
import { authApi } from '@/features/auth';
import { dashboardApi, type Dashboard } from '@/entities/dashboard';
import type { User } from '@/entities/user';

const AUTH_REDIRECT = '/auth';
const LOAD_ERROR =
  'Не удалось загрузить дашборд. Проверьте соединение и попробуйте снова.';

export interface DashboardData {
  user: User | null;
  dashboard: Dashboard | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useDashboardData(): DashboardData {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!authApi.getAccessToken()) {
      router.replace(AUTH_REDIRECT);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [me, data] = await Promise.all([authApi.me(), dashboardApi.get()]);
      setUser(me);
      setDashboard(data);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        router.replace(AUTH_REDIRECT);
        return;
      }
      setError(LOAD_ERROR);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    // Откладываем запуск на микротаск, чтобы не дёргать setState синхронно в эффекте.
    void Promise.resolve().then(() => {
      if (!cancelled) return load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  return { user, dashboard, loading, error, reload: load };
}
