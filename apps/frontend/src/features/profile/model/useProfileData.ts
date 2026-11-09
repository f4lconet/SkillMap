'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/shared/api';
import { authApi } from '@/features/auth';
import { professionApi, type Profession } from '@/entities/profession';
import { skillApi, type GapAnalysis, type Trajectory } from '@/entities/skill';
import type { User } from '@/entities/user';

const AUTH_REDIRECT = '/auth';
const LOAD_ERROR =
  'Не удалось загрузить профиль. Проверьте соединение и попробуйте снова.';

export interface ProfileData {
  user: User | null;
  professions: Profession[];
  gap: GapAnalysis | null;
  trajectory: Trajectory | null;
  loading: boolean;
  error: string | null;
  /** Перезагружает профиль и прогресс с сервера. */
  reload: () => Promise<void>;
  /** Применяет уже сохранённый профиль и пересчитывает прогресс цели. */
  applyUser: (user: User) => Promise<void>;
}

export function useProfileData(): ProfileData {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [gap, setGap] = useState<GapAnalysis | null>(null);
  const [trajectory, setTrajectory] = useState<Trajectory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProgress = useCallback(async (professionId?: string | null) => {
    if (!professionId) {
      setGap(null);
      setTrajectory(null);
      return;
    }
    const [gapResult, trajectoryResult] = await Promise.allSettled([
      skillApi.getGap(professionId),
      skillApi.getTrajectory(professionId),
    ]);
    setGap(gapResult.status === 'fulfilled' ? gapResult.value : null);
    setTrajectory(
      trajectoryResult.status === 'fulfilled' ? trajectoryResult.value : null
    );
  }, []);

  const reload = useCallback(async () => {
    if (!authApi.getAccessToken()) {
      router.replace(AUTH_REDIRECT);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [me, list] = await Promise.all([authApi.me(), professionApi.list()]);
      setUser(me);
      setProfessions(list);
      await loadProgress(me.targetProfession?.id);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        router.replace(AUTH_REDIRECT);
        return;
      }
      setError(LOAD_ERROR);
    } finally {
      setLoading(false);
    }
  }, [loadProgress, router]);

  useEffect(() => {
    let cancelled = false;
    // Откладываем запуск на микротаск, чтобы не дёргать setState синхронно в эффекте.
    void Promise.resolve().then(() => {
      if (!cancelled) return reload();
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const applyUser = useCallback(
    async (next: User) => {
      setUser(next);
      await loadProgress(next.targetProfession?.id);
    },
    [loadProgress]
  );

  return { user, professions, gap, trajectory, loading, error, reload, applyUser };
}
