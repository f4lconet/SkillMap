import type { User } from '@/entities/user/model/types';

const ACCESS_KEY = 'skillmap_access_token';
const USER_KEY = 'skillmap_user';

function canUseStorage() {
  return typeof window !== 'undefined';
}

/** Хранилище, в котором лежит текущая сессия (local — «запомнить», session — иначе). */
function activeStore(): Storage | null {
  if (!canUseStorage()) return null;
  if (localStorage.getItem(ACCESS_KEY) !== null) return localStorage;
  if (sessionStorage.getItem(ACCESS_KEY) !== null) return sessionStorage;
  return null;
}

export const authStorage = {
  getAccessToken(): string | null {
    if (!canUseStorage()) return null;
    return localStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(ACCESS_KEY);
  },

  getUser(): User | null {
    if (!canUseStorage()) return null;
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  setSession(accessToken: string, user: User, remember = true) {
    if (!canUseStorage()) return;
    const store = remember ? localStorage : sessionStorage;
    // clear the other store to avoid mixed state
    const other = remember ? sessionStorage : localStorage;
    [ACCESS_KEY, USER_KEY].forEach((k) => other.removeItem(k));

    store.setItem(ACCESS_KEY, accessToken);
    store.setItem(USER_KEY, JSON.stringify(user));
  },

  /** Обновляет access-токен после /auth/refresh, сохраняя выбранное хранилище. */
  setAccessToken(accessToken: string) {
    const store = activeStore();
    if (store) store.setItem(ACCESS_KEY, accessToken);
  },

  updateUser(user: User) {
    const store = activeStore();
    if (store) store.setItem(USER_KEY, JSON.stringify(user));
  },

  clear() {
    if (!canUseStorage()) return;
    [localStorage, sessionStorage].forEach((store) => {
      store.removeItem(ACCESS_KEY);
      store.removeItem(USER_KEY);
    });
  },
};
