'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/shared/api';
import { authApi } from '@/features/auth';
import {
  skillApi,
  type GapAnalysis,
  type PlanItemStatus,
  type Trajectory,
} from '@/entities/skill';
import type { User } from '@/entities/user';

const AUTH_REDIRECT = '/auth';
const LOAD_ERROR =
  'Не удалось загрузить траекторию. Проверьте соединение и попробуйте снова.';
const MARK_ERROR = 'Не удалось сохранить отметку пункта плана. Попробуйте ещё раз.';

export interface TrajectoryData {
  user: User | null;
  trajectory: Trajectory | null;
  gap: GapAnalysis | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** Пункт плана, отметка которого сейчас сохраняется на бэкенде. */
  savingItemId: string | null;
  /** Ошибка сохранения отметки — не переводит страницу в состояние ошибки. */
  markError: string | null;
  /** Переключает статус пункта недели через PATCH /me/plan/items/{id}. */
  toggleItem: (itemId: string) => Promise<void>;
}

/** Локально проставляет статус пункта плана в неделях и в блоке «сейчас». */
function applyItemStatus(
  trajectory: Trajectory,
  itemId: string,
  status: PlanItemStatus
): Trajectory {
  const patch = (items: Trajectory['whatToDoThisWeek']) =>
    items.map((item) => (item.itemId === itemId ? { ...item, status } : item));

  return {
    ...trajectory,
    weeks: trajectory.weeks.map((week) => ({
      ...week,
      items: patch(week.items),
    })),
    whatToDoThisWeek: patch(trajectory.whatToDoThisWeek),
  };
}

export function useTrajectoryData(): TrajectoryData {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [trajectory, setTrajectory] = useState<Trajectory | null>(null);
  const [gap, setGap] = useState<GapAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [markError, setMarkError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!authApi.getAccessToken()) {
      router.replace(AUTH_REDIRECT);
      return;
    }

    setLoading(true);
    setError(null);
    setMarkError(null);
    try {
      const me = await authApi.me();
      setUser(me);

      const professionId = me.targetProfession?.id;
      if (!professionId) {
        setTrajectory(null);
        setGap(null);
        return;
      }

      const [trajectoryResult, gapResult] = await Promise.allSettled([
        skillApi.getTrajectory(professionId),
        skillApi.getGap(professionId),
      ]);

      if (trajectoryResult.status === 'rejected') {
        throw trajectoryResult.reason;
      }

      setTrajectory(trajectoryResult.value);
      setGap(gapResult.status === 'fulfilled' ? gapResult.value : null);
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

  const professionId = user?.targetProfession?.id ?? null;

  const toggleItem = useCallback(
    async (itemId: string) => {
      if (!trajectory || !professionId) return;
      const snapshot = trajectory;
      const item = snapshot.weeks
        .flatMap((week) => week.items)
        .find((weekItem) => weekItem.itemId === itemId);
      if (!item) return;

      const next: PlanItemStatus = item.status === 'done' ? 'planned' : 'done';

      setMarkError(null);
      setSavingItemId(itemId);
      // Оптимистично переключаем кружок, не дожидаясь ответа бэкенда.
      setTrajectory(applyItemStatus(snapshot, itemId, next));

      try {
        await skillApi.setPlanItemStatus(itemId, next);
        // Бэкенд пересчитывает текущую неделю и Gap — забираем актуальное.
        const [trajectoryResult, gapResult] = await Promise.allSettled([
          skillApi.getTrajectory(professionId),
          skillApi.getGap(professionId),
        ]);
        if (trajectoryResult.status === 'fulfilled') {
          setTrajectory(trajectoryResult.value);
        }
        if (gapResult.status === 'fulfilled') {
          setGap(gapResult.value);
        }
      } catch {
        setTrajectory(snapshot);
        setMarkError(MARK_ERROR);
      } finally {
        setSavingItemId(null);
      }
    },
    [trajectory, professionId]
  );

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

  return {
    user,
    trajectory,
    gap,
    loading,
    error,
    reload: load,
    savingItemId,
    markError,
    toggleItem,
  };
}
