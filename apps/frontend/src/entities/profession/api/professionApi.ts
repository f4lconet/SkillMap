import { api } from '@/shared/api';
import type {
  Profession,
  ProfessionDetail,
  ProfessionLevel,
  ProfessionList,
} from '../model/types';

/** Максимальный limit, который принимает GET /professions. */
const PAGE_LIMIT = 50;

export type ProfessionFilters = {
  search?: string;
  direction?: string | 'all';
  level?: ProfessionLevel | 'all';
};

export const professionApi = {
  async list(filters: ProfessionFilters = {}): Promise<Profession[]> {
    const params = new URLSearchParams();
    const q = filters.search?.trim();
    if (q) params.set('q', q);
    if (filters.direction && filters.direction !== 'all') {
      params.set('direction', filters.direction);
    }
    params.set('limit', String(PAGE_LIMIT));

    const data = await api.get<ProfessionList>(`/professions?${params}`);

    // Бэкенд не фильтрует по уровню входа — применяем локально.
    if (filters.level && filters.level !== 'all') {
      return data.items.filter((p) => p.entryLevel === filters.level);
    }
    return data.items;
  },

  async getById(id: string): Promise<ProfessionDetail> {
    return api.get<ProfessionDetail>(`/professions/${id}`);
  },

  async getDirections(): Promise<string[]> {
    return api.get<string[]>('/professions/directions');
  },

  /** Счётчики по направлениям (для чипов) на основе всего каталога. */
  async getDirectionCounts(): Promise<Record<string, number>> {
    const data = await api.get<ProfessionList>(`/professions?limit=${PAGE_LIMIT}`);
    const counts: Record<string, number> = { all: data.total };
    for (const p of data.items) {
      counts[p.direction] = (counts[p.direction] ?? 0) + 1;
    }
    return counts;
  },
};
