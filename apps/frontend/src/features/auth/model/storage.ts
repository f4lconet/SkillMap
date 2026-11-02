import type { AuthTokens, User } from '@/entities/user/model/types';

const ACCESS_KEY = 'skillmap_access_token';
const REFRESH_KEY = 'skillmap_refresh_token';
const USER_KEY = 'skillmap_user';

function canUseStorage() {
  return typeof window !== 'undefined';
}

export const authStorage = {
  getAccessToken(): string | null {
    if (!canUseStorage()) return null;
    return localStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(ACCESS_KEY);
  },

  getRefreshToken(): string | null {
    if (!canUseStorage()) return null;
    return localStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(REFRESH_KEY);
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

  setSession(tokens: AuthTokens, user: User, remember = true) {
    if (!canUseStorage()) return;
    const store = remember ? localStorage : sessionStorage;
    // clear the other store to avoid mixed state
    const other = remember ? sessionStorage : localStorage;
    [ACCESS_KEY, REFRESH_KEY, USER_KEY].forEach((k) => other.removeItem(k));

    store.setItem(ACCESS_KEY, tokens.access_token);
    store.setItem(REFRESH_KEY, tokens.refresh_token);
    store.setItem(USER_KEY, JSON.stringify(user));
  },

  clear() {
    if (!canUseStorage()) return;
    [localStorage, sessionStorage].forEach((store) => {
      store.removeItem(ACCESS_KEY);
      store.removeItem(REFRESH_KEY);
      store.removeItem(USER_KEY);
    });
  },
};
