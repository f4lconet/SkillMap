import { api } from '@/shared/api';
import type { Profession, ProfessionDirection, ProfessionLevel } from '../model/types';
import { MOCK_PROFESSIONS } from './mockProfessions';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AUTH !== 'false';
// пока нет отдельного флага для данных — тот же mock-режим

export type ProfessionFilters = {
  search?: string;
  direction?: ProfessionDirection | 'all';
  level?: ProfessionLevel | 'all';
};

function filterMock(list: Profession[], filters: ProfessionFilters): Profession[] {
  let result = [...list];
  const q = filters.search?.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.slug.includes(q)
    );
  }
  if (filters.direction && filters.direction !== 'all') {
    result = result.filter((p) => p.direction === filters.direction);
  }
  if (filters.level && filters.level !== 'all') {
    result = result.filter((p) => p.level === filters.level);
  }
  return result;
}

export const professionApi = {
  async list(filters: ProfessionFilters = {}): Promise<Profession[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      return filterMock(MOCK_PROFESSIONS, filters);
    }
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.direction && filters.direction !== 'all') {
      params.set('direction', filters.direction);
    }
    if (filters.level && filters.level !== 'all') {
      params.set('level', filters.level);
    }
    const qs = params.toString();
    return api.get<Profession[]>(`/professions${qs ? `?${qs}` : ''}`);
  },

  async getById(id: string): Promise<Profession | null> {
    if (USE_MOCK) {
      return MOCK_PROFESSIONS.find((p) => p.id === id || p.slug === id) ?? null;
    }
    return api.get<Profession>(`/professions/${id}`);
  },

  /** Счётчики по направлениям (для чипов) */
  getDirectionCounts(list: Profession[] = MOCK_PROFESSIONS) {
    const counts: Record<string, number> = { all: list.length };
    for (const p of list) {
      counts[p.direction] = (counts[p.direction] || 0) + 1;
    }
    return counts;
  },
};
