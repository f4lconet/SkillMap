import { api } from '@/shared/api';
import type {
  AdminDependency,
  AdminDependencyList,
  AdminGraphSkillCreate,
  AdminMessage,
  AdminProfession,
  AdminProfessionCreate,
  AdminProfessionGraph,
  AdminProfessionList,
  AdminProfessionListParams,
  AdminProfessionPreview,
  AdminProfessionUpdate,
  AdminPublishResult,
  AdminSkillList,
  AdminSkillPatch,
  BrokenDependencyList,
  BrokenDependencyListParams,
  DependencyType,
} from '../model/types';

export const adminGraphApi = {
  /** GET /admin/professions */
  listProfessions(
    params: AdminProfessionListParams = {}
  ): Promise<AdminProfessionList> {
    return api.get<AdminProfessionList>('/admin/professions', {
      params: { limit: 100, ...params },
    });
  },

  /** POST /admin/professions */
  createProfession(payload: AdminProfessionCreate): Promise<AdminProfession> {
    return api.post<AdminProfession>('/admin/professions', payload);
  },

  /** PATCH /admin/professions/{id} */
  updateProfession(
    professionId: string,
    payload: AdminProfessionUpdate
  ): Promise<AdminProfession> {
    return api.patch<AdminProfession>(
      `/admin/professions/${professionId}`,
      payload
    );
  },

  /** DELETE /admin/professions/{id} */
  deleteProfession(professionId: string): Promise<AdminMessage> {
    return api.delete<AdminMessage>(`/admin/professions/${professionId}`);
  },

  /** GET /admin/professions/{id}/graph — сводный payload редактора. */
  getGraph(professionId: string): Promise<AdminProfessionGraph> {
    return api.get<AdminProfessionGraph>(
      `/admin/professions/${professionId}/graph`
    );
  },

  /**
   * POST /admin/professions/{id}/skills — новый навык сразу в графе.
   * В ответ приходит created навык; редактор перезапрашивает граф.
   */
  createNode(
    professionId: string,
    payload: AdminGraphSkillCreate
  ): Promise<{ id: string }> {
    return api.post<{ id: string }>(
      `/admin/professions/${professionId}/skills`,
      payload
    );
  },

  /** PATCH /admin/skills/{id} — правка полей навыка. */
  updateSkill(skillId: string, payload: AdminSkillPatch): Promise<unknown> {
    return api.patch(`/admin/skills/${skillId}`, payload);
  },

  /** PATCH /admin/skills/{id}/position — координаты после drag&drop. */
  updatePosition(
    skillId: string,
    posX: number | null,
    posY: number | null
  ): Promise<unknown> {
    return api.patch(`/admin/skills/${skillId}/position`, { posX, posY });
  },

  /** DELETE /admin/skills/{id} */
  deleteSkill(skillId: string): Promise<AdminMessage> {
    return api.delete<AdminMessage>(`/admin/skills/${skillId}`);
  },

  /** POST /admin/dependencies */
  createDependency(
    skillId: string,
    prerequisiteId: string,
    depType: DependencyType
  ): Promise<AdminDependency> {
    return api.post<AdminDependency>('/admin/dependencies', {
      skillId,
      prerequisiteId,
      depType,
    });
  },

  /** PATCH /admin/dependencies/{id} */
  updateDependency(
    dependencyId: string,
    depType: DependencyType
  ): Promise<AdminDependency> {
    return api.patch<AdminDependency>(`/admin/dependencies/${dependencyId}`, {
      depType,
    });
  },

  /** DELETE /admin/dependencies/{id} */
  deleteDependency(dependencyId: string): Promise<AdminMessage> {
    return api.delete<AdminMessage>(`/admin/dependencies/${dependencyId}`);
  },

  /** GET /admin/dependencies?related_to={skillId} — связи вокруг навыка. */
  listDependencies(relatedTo: string): Promise<AdminDependencyList> {
    return api.get<AdminDependencyList>('/admin/dependencies', {
      params: { relatedTo, limit: 200 },
    });
  },

  /** POST /admin/professions/{id}/publish */
  publish(professionId: string): Promise<AdminPublishResult> {
    return api.post<AdminPublishResult>(
      `/admin/professions/${professionId}/publish`
    );
  },

  /** GET /admin/professions/{id}/preview — черновик карты. */
  preview(professionId: string): Promise<AdminProfessionPreview> {
    return api.get<AdminProfessionPreview>(
      `/admin/professions/${professionId}/preview`
    );
  },

  /** PUT /admin/professions/{id}/layout — сброс координат к авто-раскладке. */
  resetLayout(professionId: string): Promise<AdminMessage> {
    return api.put<AdminMessage>(
      `/admin/professions/${professionId}/layout`,
      {}
    );
  },

  /** GET /admin/dependencies/validate — проверка графа на циклы. */
  validateGraph(): Promise<AdminMessage> {
    return api.get<AdminMessage>('/admin/dependencies/validate');
  },

  /** GET /admin/dependencies/broken — связи, невидимые на карте профессии. */
  listBrokenDependencies(
    params: BrokenDependencyListParams = {}
  ): Promise<BrokenDependencyList> {
    return api.get<BrokenDependencyList>('/admin/dependencies/broken', {
      params,
    });
  },

  /** GET /admin/skills — справочник навыков (для выпадающих списков). */
  listSkills(params: { q?: string; category?: string; limit?: number } = {}) {
    return api.get<AdminSkillList>('/admin/skills', {
      params: { limit: 200, ...params },
    });
  },
};
