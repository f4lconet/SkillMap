import { api } from '@/shared/api';
import type { AdminEventList, AdminEventListParams } from '../model/types';

export const adminEventApi = {
  /** GET /admin/history — журнал изменений контента (кто, что, когда). */
  list(params: AdminEventListParams = {}): Promise<AdminEventList> {
    return api.get<AdminEventList>('/admin/history', {
      params: { limit: 50, ...params },
    });
  },
};
