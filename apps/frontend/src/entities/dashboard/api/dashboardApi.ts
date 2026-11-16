import { api } from '@/shared/api';
import type { Dashboard } from '../model/types';

export const dashboardApi = {
  /** GET /me/dashboard — KPI, ближайшие шаги, история прогресса и достижения. */
  get(): Promise<Dashboard> {
    return api.get<Dashboard>('/me/dashboard');
  },
};
