import { api } from '@/shared/api';
import type { PublicProfile } from '../model/types';

export const publicProfileApi = {
  /** GET /public/u/{username} — read-only карта без авторизации */
  getByUsername(username: string): Promise<PublicProfile> {
    return api.get<PublicProfile>(`/public/u/${encodeURIComponent(username)}`);
  },

  /** GET /public/{token} — legacy-ссылка по токену */
  getByToken(token: string): Promise<PublicProfile> {
    return api.get<PublicProfile>(`/public/${encodeURIComponent(token)}`);
  },
};
