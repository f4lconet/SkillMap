'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/shared/api';
import { authApi } from '@/features/auth';
import { skillApi, type GapAnalysis } from '@/entities/skill';
import type { User } from '@/entities/user';
import { buildGapView } from './buildGapView';
import type { GapView } from './types';

const AUTH_REDIRECT = '/auth';
const LOAD_ERROR =
  'Не удалось загрузить Gap Analysis. Проверьте соединение и попробуйте снова.';

export interface GapData {
  user: User | null;
  gap: GapAnalysis | null;
  /** Готовая к отрисовке проекция Gap Analysis. */
  view: GapView | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useGapData(): GapData {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [gap, setGap] = useState<GapAnalysis | null>(null);
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
      const me = await authApi.me();
      setUser(me);

      const professionId = me.targetProfession?.id;
      if (!professionId) {
        setGap(null);
        return;
      }

      setGap(await skillApi.getGap(professionId));
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

  const view = useMemo(() => (gap ? buildGapView(gap) : null), [gap]);

  return { user, gap, view, loading, error, reload: load };
}
