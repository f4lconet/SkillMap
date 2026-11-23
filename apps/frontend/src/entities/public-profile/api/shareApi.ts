import { api } from '@/shared/api';
import type { ShareState } from '../model/types';

export const shareApi = {
  /** GET /me/share — текущее состояние публичной ссылки */
  getState(): Promise<ShareState> {
    return api.get<ShareState>('/me/share');
  },

  /** POST /me/share — включает публичную ссылку (409 без выбранной профессии) */
  enable(): Promise<ShareState> {
    return api.post<ShareState>('/me/share');
  },

  /** DELETE /me/share — отключает ссылку и удаляет токен */
  disable(): Promise<ShareState> {
    return api.delete<ShareState>('/me/share');
  },
};
