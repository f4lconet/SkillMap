import { api } from '@/shared/api';
import type {
  GapAnalysis,
  ProfessionMap,
  SkillStatus,
  Trajectory,
  UserSkill,
} from '../model/types';

export const skillApi = {
  /** GET /professions/{profession_id}/map */
  getProfessionMap(professionId: string): Promise<ProfessionMap> {
    return api.get<ProfessionMap>(`/professions/${professionId}/map`);
  },

  /** GET /me/skills */
  listMySkills(): Promise<UserSkill[]> {
    return api.get<UserSkill[]>('/me/skills');
  },

  /** PUT /me/skills/{skill_id} */
  setUserSkill(
    skillId: string,
    status: SkillStatus,
    selfScore?: number | null
  ): Promise<UserSkill> {
    return api.put<UserSkill>(`/me/skills/${skillId}`, {
      status,
      selfScore: selfScore ?? null,
    });
  },

  /** GET /me/gap/{profession_id} */
  getGap(professionId: string): Promise<GapAnalysis> {
    return api.get<GapAnalysis>(`/me/gap/${professionId}`);
  },

  /** GET /me/trajectory/{profession_id} */
  getTrajectory(professionId: string): Promise<Trajectory> {
    return api.get<Trajectory>(`/me/trajectory/${professionId}`);
  },
};
