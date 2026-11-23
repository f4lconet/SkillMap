'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/shared/api';
import { authApi } from '@/features/auth';
import {
  adminGraphApi,
  buildNodePositions,
  COLUMN_WIDTH,
  toSlug,
  type AdminGraphNode,
  type AdminProfession,
  type AdminProfessionCreate,
  type AdminProfessionGraph,
  type AdminProfessionPreview,
  type AdminProfessionUpdate,
  type AdminSkillPatch,
  type DependencyType,
} from '@/entities/admin-graph';

const AUTH_REDIRECT = '/auth';
const FORBIDDEN =
  'Недостаточно прав: раздел доступен только редакторам. Войдите под аккаунтом редактора.';
const LOAD_ERROR =
  'Не удалось загрузить данные редактора. Проверьте соединение и попробуйте снова.';
const ACTION_ERROR = 'Не удалось выполнить действие. Попробуйте ещё раз.';

/** Ключи `busy`, чтобы блокировать только нужный элемент интерфейса. */
export type AdminBusyKey =
  | 'profession'
  | 'create-skill'
  | 'save-skill'
  | 'delete-skill'
  | 'dependency'
  | 'publish'
  | 'layout'
  | 'validate'
  | 'preview';

export type AdminToast = { message: string; tone: 'success' | 'error' };

export interface AdminGraphEditor {
  professions: AdminProfession[];
  professionId: string | null;
  graph: AdminProfessionGraph | null;
  loading: boolean;
  graphLoading: boolean;
  error: string | null;
  busy: AdminBusyKey | null;
  toast: AdminToast | null;
  validation: { ok: boolean; message: string } | null;
  preview: AdminProfessionPreview | null;
  previewOpen: boolean;
  selectProfession: (id: string) => void;
  reload: () => Promise<void>;
  addSkill: () => Promise<string | null>;
  saveSkill: (
    skillId: string,
    patch: AdminSkillPatch,
    prerequisiteIds: string[]
  ) => Promise<boolean>;
  deleteSkill: (skillId: string) => Promise<boolean>;
  moveNode: (skillId: string, x: number, y: number) => Promise<void>;
  addDependency: (
    skillId: string,
    prerequisiteId: string,
    depType: DependencyType
  ) => Promise<boolean>;
  changeDependencyType: (
    dependencyId: string,
    depType: DependencyType
  ) => Promise<boolean>;
  removeDependency: (dependencyId: string) => Promise<boolean>;
  publish: () => Promise<void>;
  resetLayout: () => Promise<void>;
  validate: () => Promise<void>;
  updateProfession: (payload: AdminProfessionUpdate) => Promise<boolean>;
  createProfession: (payload: AdminProfessionCreate) => Promise<boolean>;
  deleteProfession: () => Promise<void>;
  openPreview: () => Promise<void>;
  closePreview: () => void;
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

/** Позиция нового узла: справа от существующих, по центру по вертикали. */
function nextNodePosition(nodes: AdminGraphNode[]): { x: number; y: number } {
  const positions = [...buildNodePositions(nodes).values()];
  if (positions.length === 0) return { x: 0, y: 0 };
  const x = Math.max(...positions.map((p) => p.x)) + COLUMN_WIDTH;
  const y = Math.round(
    positions.reduce((sum, p) => sum + p.y, 0) / positions.length
  );
  return { x, y };
}

export function useAdminGraph(): AdminGraphEditor {
  const router = useRouter();

  const [professions, setProfessions] = useState<AdminProfession[]>([]);
  const [professionId, setProfessionId] = useState<string | null>(null);
  const [graph, setGraph] = useState<AdminProfessionGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [graphLoading, setGraphLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<AdminBusyKey | null>(null);
  const [toast, setToast] = useState<AdminToast | null>(null);
  const [validation, setValidation] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [preview, setPreview] = useState<AdminProfessionPreview | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const toastTimer = useRef<number | null>(null);

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
    }, 3600);
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

  const handleError = useCallback(
    (err: unknown, fallback: string) => {
      if (redirectIfUnauthorized(err)) return;
      showToast(describeError(err, fallback), 'error');
    },
    [redirectIfUnauthorized, showToast]
  );

  const loadProfessions = useCallback(async () => {
    if (!authApi.getAccessToken()) {
      router.replace(AUTH_REDIRECT);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await adminGraphApi.listProfessions(200);
      setProfessions(data.items);
      setProfessionId((prev) => {
        if (prev && data.items.some((item) => item.id === prev)) return prev;
        return data.items[0]?.id ?? null;
      });
    } catch (err) {
      if (redirectIfUnauthorized(err)) return;
      setError(describeError(err, LOAD_ERROR));
    } finally {
      setLoading(false);
    }
  }, [redirectIfUnauthorized, router]);

  const loadGraph = useCallback(
    async (id: string) => {
      setGraphLoading(true);
      setError(null);
      try {
        setGraph(await adminGraphApi.getGraph(id));
      } catch (err) {
        if (redirectIfUnauthorized(err)) return;
        setError(describeError(err, LOAD_ERROR));
      } finally {
        setGraphLoading(false);
      }
    },
    [redirectIfUnauthorized]
  );

  useEffect(() => {
    let cancelled = false;
    // Микротаск: не дёргаем setState синхронно в теле эффекта.
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
      if (cancelled) return;
      if (!professionId) {
        setGraph(null);
        setValidation(null);
        return;
      }
      void loadGraph(professionId);
    });
    return () => {
      cancelled = true;
    };
  }, [professionId, loadGraph]);

  const reload = useCallback(async () => {
    await loadProfessions();
    if (professionId) await loadGraph(professionId);
  }, [loadProfessions, loadGraph, professionId]);

  /** Выполняет действие с индикатором и обработкой ошибок. */
  const attempt = useCallback(
    async <T,>(
      key: AdminBusyKey,
      action: () => Promise<T>,
      successMessage?: string
    ): Promise<T | null> => {
      setBusy(key);
      try {
        const result = await action();
        if (successMessage) showToast(successMessage, 'success');
        return result;
      } catch (err) {
        handleError(err, ACTION_ERROR);
        return null;
      } finally {
        setBusy(null);
      }
    },
    [handleError, showToast]
  );

  const addSkill = useCallback(async (): Promise<string | null> => {
    if (!graph) return null;
    const { x, y } = nextNodePosition(graph.nodes);
    const created = await attempt(
      'create-skill',
      () =>
        adminGraphApi.createNode(graph.professionId, {
          slug: `${toSlug('Новый навык')}-${Date.now().toString(36)}`,
          title: 'Новый навык',
          subtitle: '',
          description: '',
          category: '',
          difficulty: 3,
          estimatedHours: 8,
          posX: x,
          posY: y,
          isCore: true,
        }),
      'Навык добавлен'
    );
    if (!created) return null;
    await loadGraph(graph.professionId);
    return created.id;
  }, [graph, attempt, loadGraph]);

  const saveSkill = useCallback(
    async (
      skillId: string,
      patch: AdminSkillPatch,
      prerequisiteIds: string[]
    ): Promise<boolean> => {
      if (!graph) return false;
      const existing = graph.edges.filter((edge) => edge.skillId === skillId);
      const current = new Set(existing.map((edge) => edge.prerequisiteId));
      const desired = new Set(prerequisiteIds);
      const toAdd = prerequisiteIds.filter((id) => !current.has(id));
      const toRemove = existing.filter(
        (edge) => !desired.has(edge.prerequisiteId)
      );

      const done = await attempt(
        'save-skill',
        async () => {
          await adminGraphApi.updateSkill(skillId, patch);
          for (const prerequisiteId of toAdd) {
            await adminGraphApi.createDependency(
              skillId,
              prerequisiteId,
              'required'
            );
          }
          for (const edge of toRemove) {
            await adminGraphApi.deleteDependency(edge.id);
          }
        },
        'Изменения сохранены'
      );
      await loadGraph(graph.professionId);
      return done !== null;
    },
    [graph, attempt, loadGraph]
  );

  const deleteSkill = useCallback(
    async (skillId: string): Promise<boolean> => {
      if (!graph) return false;
      const done = await attempt(
        'delete-skill',
        () => adminGraphApi.deleteSkill(skillId),
        'Навык удалён'
      );
      await loadGraph(graph.professionId);
      return done !== null;
    },
    [graph, attempt, loadGraph]
  );

  const moveNode = useCallback(
    async (skillId: string, x: number, y: number) => {
      if (!graph) return;
      const previous = graph;
      const posX = Math.round(x);
      const posY = Math.round(y);
      setGraph({
        ...graph,
        nodes: graph.nodes.map((node) =>
          node.id === skillId ? { ...node, posX, posY } : node
        ),
      });
      setBusy('layout');
      try {
        await adminGraphApi.updatePosition(skillId, posX, posY);
      } catch (err) {
        setGraph(previous);
        handleError(err, 'Не удалось сохранить позицию навыка.');
      } finally {
        setBusy(null);
      }
    },
    [graph, handleError]
  );

  const addDependency = useCallback(
    async (
      skillId: string,
      prerequisiteId: string,
      depType: DependencyType
    ): Promise<boolean> => {
      if (!graph) return false;
      const done = await attempt(
        'dependency',
        () => adminGraphApi.createDependency(skillId, prerequisiteId, depType),
        'Связь добавлена'
      );
      await loadGraph(graph.professionId);
      return done !== null;
    },
    [graph, attempt, loadGraph]
  );

  const changeDependencyType = useCallback(
    async (
      dependencyId: string,
      depType: DependencyType
    ): Promise<boolean> => {
      if (!graph) return false;
      const done = await attempt(
        'dependency',
        () => adminGraphApi.updateDependency(dependencyId, depType),
        'Тип связи обновлён'
      );
      await loadGraph(graph.professionId);
      return done !== null;
    },
    [graph, attempt, loadGraph]
  );

  const removeDependency = useCallback(
    async (dependencyId: string): Promise<boolean> => {
      if (!graph) return false;
      const done = await attempt(
        'dependency',
        () => adminGraphApi.deleteDependency(dependencyId),
        'Связь удалена'
      );
      await loadGraph(graph.professionId);
      return done !== null;
    },
    [graph, attempt, loadGraph]
  );

  const publish = useCallback(async () => {
    if (!graph) return;
    const result = await attempt('publish', () =>
      adminGraphApi.publish(graph.professionId)
    );
    if (!result) return;
    showToast(`Версия ${result.contentVersion} опубликована`, 'success');
    await loadGraph(graph.professionId);
    await loadProfessions();
  }, [graph, attempt, showToast, loadGraph, loadProfessions]);

  const resetLayout = useCallback(async () => {
    if (!graph) return;
    const result = await attempt(
      'layout',
      () => adminGraphApi.resetLayout(graph.professionId),
      'Раскладка сброшена'
    );
    if (!result) return;
    await loadGraph(graph.professionId);
  }, [graph, attempt, loadGraph]);

  const validate = useCallback(async () => {
    const result = await attempt('validate', () =>
      adminGraphApi.validateGraph()
    );
    if (result) {
      setValidation({ ok: true, message: result.detail });
      showToast(result.detail, 'success');
      return;
    }
    setValidation({
      ok: false,
      message: 'В графе есть ошибки: проверьте связи и устраните циклы.',
    });
  }, [attempt, showToast]);

  const updateProfession = useCallback(
    async (payload: AdminProfessionUpdate): Promise<boolean> => {
      if (!professionId) return false;
      const updated = await attempt(
        'profession',
        () => adminGraphApi.updateProfession(professionId, payload),
        'Профессия обновлена'
      );
      if (!updated) return false;
      await loadGraph(professionId);
      await loadProfessions();
      return true;
    },
    [professionId, attempt, loadGraph, loadProfessions]
  );

  const createProfession = useCallback(
    async (payload: AdminProfessionCreate): Promise<boolean> => {
      const created = await attempt(
        'profession',
        () => adminGraphApi.createProfession(payload),
        'Профессия создана'
      );
      if (!created) return false;
      await loadProfessions();
      setProfessionId(created.id);
      return true;
    },
    [attempt, loadProfessions]
  );

  const deleteProfession = useCallback(async () => {
    if (!professionId) return;
    const done = await attempt(
      'profession',
      () => adminGraphApi.deleteProfession(professionId),
      'Профессия удалена'
    );
    if (!done) return;
    setPreviewOpen(false);
    setPreview(null);
    // после удаления список выберет первую доступную профессию (или null)
    await loadProfessions();
  }, [professionId, attempt, loadProfessions]);

  const openPreview = useCallback(async () => {
    if (!graph) return;
    const data = await attempt('preview', () =>
      adminGraphApi.preview(graph.professionId)
    );
    if (!data) return;
    setPreview(data);
    setPreviewOpen(true);
  }, [graph, attempt]);

  const closePreview = useCallback(() => setPreviewOpen(false), []);

  const selectProfession = useCallback(
    (id: string) => {
      if (id === professionId) return;
      setValidation(null);
      setPreview(null);
      setPreviewOpen(false);
      setProfessionId(id);
    },
    [professionId]
  );

  return {
    professions,
    professionId,
    graph,
    loading,
    graphLoading,
    error,
    busy,
    toast,
    validation,
    preview,
    previewOpen,
    selectProfession,
    reload,
    addSkill,
    saveSkill,
    deleteSkill,
    moveNode,
    addDependency,
    changeDependencyType,
    removeDependency,
    publish,
    resetLayout,
    validate,
    updateProfession,
    createProfession,
    deleteProfession,
    openPreview,
    closePreview,
    dismissToast,
  };
}
