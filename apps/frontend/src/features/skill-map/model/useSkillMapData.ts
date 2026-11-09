'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/shared/api';
import { authApi } from '@/features/auth';
import {
  skillApi,
  type GapAnalysis,
  type ProfessionMap,
  type SkillStatus,
  type Trajectory,
} from '@/entities/skill';
import type { User } from '@/entities/user';
import { buildSkillGraph, type SkillGraph } from './graph';
import type { NodePositions } from './types';

const AUTH_REDIRECT = '/auth';
const LOAD_ERROR =
  'Не удалось загрузить карту навыков. Проверьте соединение и попробуйте снова.';
const SAVE_ERROR = 'Не удалось сохранить навык. Попробуйте ещё раз.';

/** Одно действие на карте — шаг истории для отмены/повтора. */
interface SkillAction {
  kind: 'skill';
  skillId: string;
  from: SkillStatus;
  to: SkillStatus;
}

/** Перемещение узлов: снимки оверрайдов позиций до и после перетаскивания. */
interface MoveAction {
  kind: 'move';
  before: NodePositions;
  after: NodePositions;
}

type HistoryEntry = SkillAction | MoveAction;

export interface SkillMapData {
  user: User | null;
  map: ProfessionMap | null;
  gap: GapAnalysis | null;
  trajectory: Trajectory | null;
  graph: SkillGraph;
  loading: boolean;
  error: string | null;
  savingId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  reload: () => Promise<void>;
  /** PUT /me/skills/{skill_id} + перезагрузка карты, gap и траектории. */
  markSkill: (skillId: string, status: SkillStatus) => Promise<void>;
  /** Запоминает новые позиции узлов после перетаскивания. */
  moveNodes: (positions: NodePositions) => void;
  /** Отменяет последнее действие на карте (Ctrl+Z). */
  undo: () => Promise<void>;
  /** Повторяет отменённое действие (Ctrl+Y). */
  redo: () => Promise<void>;
}

export function useSkillMapData(): SkillMapData {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [map, setMap] = useState<ProfessionMap | null>(null);
  const [gap, setGap] = useState<GapAnalysis | null>(null);
  const [trajectory, setTrajectory] = useState<Trajectory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [positions, setPositions] = useState<NodePositions>({});
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [future, setFuture] = useState<HistoryEntry[]>([]);

  const mapRef = useRef<ProfessionMap | null>(null);
  useEffect(() => {
    mapRef.current = map;
  }, [map]);

  // Другая профессия — своя раскладка и своя история действий.
  // Сброс откладываем на микротаск, чтобы не дёргать setState синхронно в эффекте.
  const professionId = map?.professionId ?? null;
  useEffect(() => {
    void Promise.resolve().then(() => {
      setPositions({});
      setHistory([]);
      setFuture([]);
    });
  }, [professionId]);

  const loadProfession = useCallback(async (professionId?: string | null) => {
    if (!professionId) {
      setMap(null);
      setGap(null);
      setTrajectory(null);
      return;
    }
    const [mapResult, gapResult, trajectoryResult] = await Promise.allSettled([
      skillApi.getProfessionMap(professionId),
      skillApi.getGap(professionId),
      skillApi.getTrajectory(professionId),
    ]);
    setMap(mapResult.status === 'fulfilled' ? mapResult.value : null);
    setGap(gapResult.status === 'fulfilled' ? gapResult.value : null);
    setTrajectory(
      trajectoryResult.status === 'fulfilled' ? trajectoryResult.value : null
    );
    if (mapResult.status === 'rejected') {
      setError(LOAD_ERROR);
    }
  }, []);

  const reload = useCallback(async () => {
    if (!authApi.getAccessToken()) {
      router.replace(AUTH_REDIRECT);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const me = await authApi.me();
      setUser(me);
      await loadProfession(me.targetProfession?.id);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        router.replace(AUTH_REDIRECT);
        return;
      }
      setError(LOAD_ERROR);
    } finally {
      setLoading(false);
    }
  }, [loadProfession, router]);

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

  const setStatus = useCallback(
    async (skillId: string, status: SkillStatus): Promise<boolean> => {
      setSavingId(skillId);
      setError(null);
      try {
        await skillApi.setUserSkill(skillId, status);
        const professionId = user?.targetProfession?.id;
        if (professionId) await loadProfession(professionId);
        return true;
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) {
          router.replace(AUTH_REDIRECT);
          return false;
        }
        setError(SAVE_ERROR);
        return false;
      } finally {
        setSavingId(null);
      }
    },
    [loadProfession, router, user]
  );

  const markSkill = useCallback(
    async (skillId: string, status: SkillStatus) => {
      const previous =
        mapRef.current?.skills.find((skill) => skill.id === skillId)?.userStatus ??
        'not_started';
      if (previous === status) return;
      const saved = await setStatus(skillId, status);
      if (!saved) return;
      setHistory((stack) => [
        ...stack,
        { kind: 'skill', skillId, from: previous, to: status },
      ]);
      setFuture([]);
    },
    [setStatus]
  );

  const moveNodes = useCallback(
    (next: NodePositions) => {
      const before = positions;
      const changed = Object.entries(next).some(([id, point]) => {
        const previous = before[id];
        return (
          !previous || previous.x !== point.x || previous.y !== point.y
        );
      });
      if (!changed) return;
      setPositions(next);
      setHistory((stack) => [...stack, { kind: 'move', before, after: next }]);
      setFuture([]);
    },
    [positions]
  );

  const undo = useCallback(async () => {
    const action = history[history.length - 1];
    if (!action) return;
    if (action.kind === 'move') {
      setPositions(action.before);
      setHistory((stack) => stack.slice(0, -1));
      setFuture((stack) => [...stack, action]);
      return;
    }
    const saved = await setStatus(action.skillId, action.from);
    if (!saved) return;
    setHistory((stack) => stack.slice(0, -1));
    setFuture((stack) => [...stack, action]);
  }, [history, setStatus]);

  const redo = useCallback(async () => {
    const action = future[future.length - 1];
    if (!action) return;
    if (action.kind === 'move') {
      setPositions(action.after);
      setFuture((stack) => stack.slice(0, -1));
      setHistory((stack) => [...stack, action]);
      return;
    }
    const saved = await setStatus(action.skillId, action.to);
    if (!saved) return;
    setFuture((stack) => stack.slice(0, -1));
    setHistory((stack) => [...stack, action]);
  }, [future, setStatus]);

  const graph = useMemo(() => {
    const base = buildSkillGraph(map);
    return {
      nodes: base.nodes.map((node) => ({
        ...node,
        position: positions[node.id] ?? node.position,
        data: { ...node.data },
      })),
      edges: base.edges,
    };
  }, [map, positions]);

  return {
    user,
    map,
    gap,
    trajectory,
    graph,
    loading,
    error,
    savingId,
    canUndo: history.length > 0 && savingId === null,
    canRedo: future.length > 0 && savingId === null,
    reload,
    markSkill,
    moveNodes,
    undo,
    redo,
  };
}
