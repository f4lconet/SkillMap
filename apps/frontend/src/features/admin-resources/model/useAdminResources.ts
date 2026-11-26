'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/shared/api';
import { authApi } from '@/features/auth';
import {
  adminGraphApi,
  type AdminProfession,
  type AdminSkill,
} from '@/entities/admin-graph';
import {
  adminResourceApi,
  EMPTY_RESOURCE_DRAFT,
  parseHours,
  parsePosition,
  resourceToDraft,
  type AdminResource,
  type AdminResourceDraft,
  type AdminResourceLinkCheckParams,
  type AdminResourceStats,
  type ResourceSortField,
  type ResourceStatus,
  type ResourceType,
  type SortDirection,
} from '@/entities/admin-resource';

const AUTH_REDIRECT = '/auth';
const FORBIDDEN =
  'Недостаточно прав: раздел доступен только редакторам. Войдите под аккаунтом редактора.';
const LOAD_ERROR =
  'Не удалось загрузить ресурсы. Проверьте соединение и попробуйте снова.';
const ACTION_ERROR = 'Не удалось выполнить действие. Попробуйте ещё раз.';
const PAGE_SIZE = 25;

export type ResourceFilters = {
  q: string;
  professionId: string;
  resourceType: ResourceType | '';
  status: ResourceStatus | '';
  sortBy: ResourceSortField;
  sortDir: SortDirection;
};

export type ResourceToast = { message: string; tone: 'success' | 'error' };

export type ResourceBusy =
  | 'save'
  | 'delete'
  | 'publish'
  | 'check'
  | 'bulk'
  | null;

export const EMPTY_FILTERS: ResourceFilters = {
  q: '',
  professionId: '',
  resourceType: '',
  status: '',
  sortBy: 'skill',
  sortDir: 'asc',
};

export interface AdminResourcesState {
  professions: AdminProfession[];
  skills: AdminSkill[];
  items: AdminResource[];
  total: number;
  stats: AdminResourceStats | null;
  filters: ResourceFilters;
  offset: number;
  limit: number;
  loading: boolean;
  listLoading: boolean;
  error: string | null;
  busy: ResourceBusy;
  toast: ResourceToast | null;
  selectedId: string | null;
  draft: AdminResourceDraft | null;
  isNew: boolean;
  skillResources: AdminResource[];
  skillResourcesLoading: boolean;
  setFilter: <K extends keyof ResourceFilters>(
    key: K,
    value: ResourceFilters[K]
  ) => void;
  setOffset: (offset: number) => void;
  resetFilters: () => void;
  selectResource: (id: string) => void;
  startCreate: () => void;
  cancelDraft: () => void;
  changeDraft: (patch: Partial<AdminResourceDraft>) => void;
  save: () => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  publish: (id: string) => Promise<boolean>;
  checkLink: (id: string) => Promise<boolean>;
  checkLinks: (params?: AdminResourceLinkCheckParams) => Promise<boolean>;
  reload: () => Promise<void>;
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

function buildPayload(draft: AdminResourceDraft) {
  return {
    skillId: draft.skillId,
    title: draft.title.trim(),
    url: draft.url.trim(),
    resourceType: draft.resourceType,
    isFree: draft.isFree,
    provider: draft.provider.trim(),
    lang: draft.lang,
    description: draft.description,
    estimatedHours: parseHours(draft.estimatedHours),
    position: parsePosition(draft.position),
    status: draft.status,
  };
}

export function useAdminResources(): AdminResourcesState {
  const router = useRouter();

  const [professions, setProfessions] = useState<AdminProfession[]>([]);
  const [skills, setSkills] = useState<AdminSkill[]>([]);
  const [items, setItems] = useState<AdminResource[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<AdminResourceStats | null>(null);
  const [filters, setFilters] = useState<ResourceFilters>(EMPTY_FILTERS);
  const [debouncedQ, setDebouncedQ] = useState('');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<ResourceBusy>(null);
  const [toast, setToast] = useState<ResourceToast | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminResourceDraft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [skillResources, setSkillResources] = useState<AdminResource[]>([]);
  const [skillResourcesLoading, setSkillResourcesLoading] = useState(false);

  const toastTimer = useRef<number | null>(null);
  const listRequest = useRef(0);
  const selectionRef = useRef<string | null>(null);
  const skillRequest = useRef(0);

  const dismissToast = useCallback(() => {
    if (toastTimer.current !== null) {
      window.clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    (message: string, tone: 'success' | 'error') => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
      setToast({ message, tone });
      toastTimer.current = window.setTimeout(() => {
        setToast(null);
        toastTimer.current = null;
      }, 3800);
    },
    []
  );

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

  const selectResource = useCallback(
    (id: string) => {
      selectionRef.current = id;
      setSelectedId(id);
      setIsNew(false);
      const found = items.find((item) => item.id === id);
      if (found) {
        setDraft(resourceToDraft(found));
        return;
      }
      void adminResourceApi
        .get(id)
        .then((resource) => {
          if (selectionRef.current !== id) return;
          setDraft(resourceToDraft(resource));
        })
        .catch((err: unknown) => handleError(err, ACTION_ERROR));
    },
    [handleError, items]
  );

  // Поиск применяем с задержкой, чтобы не дёргать API на каждый символ.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(filters.q.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [filters.q]);

  const loadProfessionsAndSkills = useCallback(async () => {
    if (!authApi.getAccessToken()) {
      router.replace(AUTH_REDIRECT);
      return;
    }
    try {
      const [professionList, skillList] = await Promise.all([
        adminGraphApi.listProfessions({ limit: 200 }),
        adminGraphApi.listSkills({ limit: 200 }),
      ]);
      setProfessions(professionList.items);
      setSkills(skillList.items);
    } catch (err) {
      if (redirectIfUnauthorized(err)) return;
      setError(describeError(err, LOAD_ERROR));
    }
  }, [redirectIfUnauthorized, router]);

  const loadStats = useCallback(async () => {
    try {
      setStats(await adminResourceApi.stats(filters.professionId || null));
    } catch (err) {
      if (redirectIfUnauthorized(err)) return;
      setError(describeError(err, LOAD_ERROR));
    }
  }, [filters.professionId, redirectIfUnauthorized]);

  const loadList = useCallback(async () => {
    const requestId = ++listRequest.current;
    setListLoading(true);
    setError(null);
    try {
      const data = await adminResourceApi.list({
        q: debouncedQ || undefined,
        professionId: filters.professionId || undefined,
        resourceType: filters.resourceType || undefined,
        status: filters.status || undefined,
        sortBy: filters.sortBy,
        sortDir: filters.sortDir,
        limit: PAGE_SIZE,
        offset,
      });
      if (requestId !== listRequest.current) return;
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      if (requestId !== listRequest.current) return;
      if (redirectIfUnauthorized(err)) return;
      setError(describeError(err, LOAD_ERROR));
    } finally {
      if (requestId === listRequest.current) setListLoading(false);
    }
  }, [
    debouncedQ,
    filters.professionId,
    filters.resourceType,
    filters.status,
    filters.sortBy,
    filters.sortDir,
    offset,
    redirectIfUnauthorized,
  ]);

  const loadSkillResources = useCallback(async () => {
    const skillId = draft?.skillId;
    const requestId = ++skillRequest.current;
    if (!skillId) {
      setSkillResources([]);
      setSkillResourcesLoading(false);
      return;
    }
    setSkillResourcesLoading(true);
    try {
      const data = await adminResourceApi.list({
        skillId,
        limit: 100,
        sortBy: 'title',
        sortDir: 'asc',
      });
      if (requestId !== skillRequest.current) return;
      setSkillResources(data.items);
    } catch (err) {
      if (requestId !== skillRequest.current) return;
      if (redirectIfUnauthorized(err)) return;
      setError(describeError(err, LOAD_ERROR));
    } finally {
      if (requestId === skillRequest.current) setSkillResourcesLoading(false);
    }
  }, [draft?.skillId, redirectIfUnauthorized]);

  const reload = useCallback(async () => {
    await Promise.all([loadList(), loadStats(), loadSkillResources()]);
  }, [loadList, loadSkillResources, loadStats]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadProfessionsAndSkills();
    });
    return () => {
      cancelled = true;
    };
  }, [loadProfessionsAndSkills]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadStats();
    });
    return () => {
      cancelled = true;
    };
  }, [loadStats]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadList();
    });
    return () => {
      cancelled = true;
    };
  }, [loadList]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Автовыбор первого ресурса, чтобы панель свойств не пустовала.
  useEffect(() => {
    if (isNew || selectedId || items.length === 0) return;
    const first = items[0];
    void Promise.resolve().then(() => {
      selectionRef.current = first.id;
      setSelectedId(first.id);
      setDraft(resourceToDraft(first));
    });
  }, [items, isNew, selectedId]);

  // Ресурсы выбранного навыка для таблицы соответствий.
  useEffect(() => {
    void Promise.resolve().then(() => loadSkillResources());
  }, [loadSkillResources]);

  const setFilter = useCallback(
    <K extends keyof ResourceFilters>(key: K, value: ResourceFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setOffset(0);
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setOffset(0);
  }, []);

  const startCreate = useCallback(() => {
    setSelectedId(null);
    setIsNew(true);
    setDraft({
      ...EMPTY_RESOURCE_DRAFT,
      skillId:
        draft?.skillId ??
        items[0]?.skillId ??
        skills[0]?.id ??
        '',
    });
  }, [draft?.skillId, items, skills]);

  const cancelDraft = useCallback(() => {
    if (isNew) {
      setIsNew(false);
      const found = items.find((item) => item.id === selectedId);
      setDraft(found ? resourceToDraft(found) : null);
      return;
    }
    const found = items.find((item) => item.id === selectedId);
    if (found) setDraft(resourceToDraft(found));
  }, [isNew, items, selectedId]);

  const changeDraft = useCallback((patch: Partial<AdminResourceDraft>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    if (!draft) return false;
    if (!draft.title.trim()) {
      showToast('Введите название ресурса', 'error');
      return false;
    }
    if (!draft.skillId) {
      showToast('Выберите навык, к которому относится ресурс', 'error');
      return false;
    }
    setBusy('save');
    try {
      const payload = buildPayload(draft);
      if (!isNew && !selectedId) {
        showToast('Сначала выберите ресурс', 'error');
        return false;
      }
      const saved = isNew
        ? await adminResourceApi.create(payload)
        : await adminResourceApi.update(selectedId as string, payload);
      setSelectedId(saved.id);
      setIsNew(false);
      setDraft(resourceToDraft(saved));
      showToast(isNew ? 'Ресурс создан' : 'Изменения сохранены', 'success');
      await reload();
      return true;
    } catch (err) {
      handleError(err, ACTION_ERROR);
      return false;
    } finally {
      setBusy(null);
    }
  }, [draft, handleError, isNew, reload, selectedId, showToast]);

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setBusy('delete');
      try {
        await adminResourceApi.remove(id);
        showToast('Ресурс удалён', 'success');
        if (selectedId === id) {
          setSelectedId(null);
          setDraft(null);
          setIsNew(false);
        }
        await reload();
        return true;
      } catch (err) {
        handleError(err, ACTION_ERROR);
        return false;
      } finally {
        setBusy(null);
      }
    },
    [handleError, reload, selectedId, showToast]
  );

  const applySaved = useCallback(
    (saved: AdminResource) => {
      if (selectedId === saved.id) setDraft(resourceToDraft(saved));
    },
    [selectedId]
  );

  const publish = useCallback(
    async (id: string): Promise<boolean> => {
      setBusy('publish');
      try {
        const saved = await adminResourceApi.publish(id);
        applySaved(saved);
        showToast('Ресурс опубликован', 'success');
        await reload();
        return true;
      } catch (err) {
        handleError(err, ACTION_ERROR);
        return false;
      } finally {
        setBusy(null);
      }
    },
    [applySaved, handleError, reload, showToast]
  );

  const checkLink = useCallback(
    async (id: string): Promise<boolean> => {
      setBusy('check');
      try {
        const saved = await adminResourceApi.checkLink(id);
        applySaved(saved);
        showToast(
          saved.linkStatus === 'ok'
            ? 'Ссылка доступна'
            : 'Ссылка недоступна — ресурс отправлен на проверку',
          saved.linkStatus === 'ok' ? 'success' : 'error'
        );
        await reload();
        return true;
      } catch (err) {
        handleError(err, ACTION_ERROR);
        return false;
      } finally {
        setBusy(null);
      }
    },
    [applySaved, handleError, reload, showToast]
  );

  const checkLinks = useCallback(
    async (params: AdminResourceLinkCheckParams = {}): Promise<boolean> => {
      setBusy('bulk');
      try {
        const result = await adminResourceApi.checkLinks({
          professionId: filters.professionId || undefined,
          ...params,
          limit: params.limit ?? 50,
        });
        showToast(
          `Проверено ссылок: ${result.checked}. Доступно: ${result.ok}, недоступно: ${result.broken}`,
          result.broken > 0 ? 'error' : 'success'
        );
        await reload();
        return true;
      } catch (err) {
        handleError(err, ACTION_ERROR);
        return false;
      } finally {
        setBusy(null);
      }
    },
    [filters.professionId, handleError, reload, showToast]
  );

  return {
    professions,
    skills,
    items,
    total,
    stats,
    filters,
    offset,
    limit: PAGE_SIZE,
    loading,
    listLoading,
    error,
    busy,
    toast,
    selectedId,
    draft,
    isNew,
    skillResources,
    skillResourcesLoading,
    setFilter,
    setOffset,
    resetFilters,
    selectResource,
    startCreate,
    cancelDraft,
    changeDraft,
    save,
    remove,
    publish,
    checkLink,
    checkLinks,
    reload,
    dismissToast,
  };
}
