import { api, downloadFile } from '@/shared/api';
import type {
  AdminEditorList,
  AdminEventList,
  AdminEventListParams,
} from '../model/types';

export const adminEventApi = {
  /** GET /admin/history — журнал изменений контента (кто, что, когда). */
  list(params: AdminEventListParams = {}): Promise<AdminEventList> {
    return api.get<AdminEventList>('/admin/history', {
      params: { limit: 50, ...params },
    });
  },

  /** GET /admin/editors — авторы журнала для фильтра «Автор». */
  listEditors(): Promise<AdminEditorList> {
    return api.get<AdminEditorList>('/admin/editors');
  },

  /** GET /admin/history/export — тот же журнал файлом CSV (blob). */
  exportCsv(params: AdminEventListParams = {}): Promise<Blob> {
    return downloadFile('/admin/history/export', params);
  },
};
