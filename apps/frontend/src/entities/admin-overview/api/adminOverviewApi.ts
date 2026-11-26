import { api } from '@/shared/api';
import type { AdminOverview, AdminOverviewParams } from '../model/types';

export const adminOverviewApi = {
  /** GET /admin/overview — одна ручка на всю стартовую страницу админки. */
  get(params: AdminOverviewParams = {}): Promise<AdminOverview> {
    return api.get<AdminOverview>('/admin/overview', {
      params: { recentLimit: 5, ...params },
    });
  },
};
