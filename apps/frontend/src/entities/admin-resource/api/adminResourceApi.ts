import { api } from '@/shared/api';
import type {
  AdminResource,
  AdminResourceCreate,
  AdminResourceLinkCheckParams,
  AdminResourceLinkCheckResult,
  AdminResourceList,
  AdminResourceListParams,
  AdminResourceStats,
  AdminResourceUpdate,
} from '../model/types';

export const adminResourceApi = {
  /** GET /admin/resources */
  list(params: AdminResourceListParams = {}): Promise<AdminResourceList> {
    return api.get<AdminResourceList>('/admin/resources', { params });
  },

  /** GET /admin/resources/stats */
  stats(professionId?: string | null): Promise<AdminResourceStats> {
    return api.get<AdminResourceStats>('/admin/resources/stats', {
      params: professionId ? { professionId } : undefined,
    });
  },

  /** GET /admin/resources/{id} */
  get(resourceId: string): Promise<AdminResource> {
    return api.get<AdminResource>(`/admin/resources/${resourceId}`);
  },

  /** POST /admin/resources */
  create(payload: AdminResourceCreate): Promise<AdminResource> {
    return api.post<AdminResource>('/admin/resources', payload);
  },

  /** PATCH /admin/resources/{id} */
  update(
    resourceId: string,
    payload: AdminResourceUpdate
  ): Promise<AdminResource> {
    return api.patch<AdminResource>(
      `/admin/resources/${resourceId}`,
      payload
    );
  },

  /** DELETE /admin/resources/{id} */
  remove(resourceId: string): Promise<{ detail: string }> {
    return api.delete<{ detail: string }>(`/admin/resources/${resourceId}`);
  },

  /** POST /admin/resources/{id}/publish */
  publish(resourceId: string): Promise<AdminResource> {
    return api.post<AdminResource>(`/admin/resources/${resourceId}/publish`);
  },

  /** POST /admin/resources/{id}/check-link */
  checkLink(resourceId: string): Promise<AdminResource> {
    return api.post<AdminResource>(
      `/admin/resources/${resourceId}/check-link`
    );
  },

  /** POST /admin/resources/check-links — пакетная проверка ссылок. */
  checkLinks(
    params: AdminResourceLinkCheckParams = {}
  ): Promise<AdminResourceLinkCheckResult> {
    return api.post<AdminResourceLinkCheckResult>(
      '/admin/resources/check-links',
      undefined,
      { params }
    );
  },
};
