'use client';

import { useEffect, useState } from 'react';
import { ApiClientError } from '@/shared/api';
import type { User } from '@/entities/user';
import { authApi } from '../api/authApi';

export interface SessionUser {
  user: User | null;
  /** false, пока сессия не проверена — UI не показывает гостевые кнопки раньше времени. */
  ready: boolean;
}

function isUnauthorized(error: unknown): boolean {
  const status = error instanceof ApiClientError ? error.status : 0;
  return status === 401 || status === 403;
}

/** Один запрос на все смонтированные компоненты (шапка + CTA на странице). */
let sessionRequest: Promise<User> | null = null;

function loadSession(): Promise<User> {
  sessionRequest ??= authApi.me().finally(() => {
    sessionRequest = null;
  });
  return sessionRequest;
}

/**
 * Текущий пользователь на клиенте.
 *
 * Профиль в storage — это кеш, а не доказательство сессии: access-токен живёт
 * 15 минут, а пользователя могли удалить при пересоздании БД. Поэтому при наличии
 * токена сессия проверяется через GET /me, а кеш служит только fallback'ом,
 * если бэкенд недоступен (сеть/5xx) — чтобы не «разлогинивать» при сбое.
 */
export function useSessionUser(): SessionUser {
  const [state, setState] = useState<SessionUser>({ user: null, ready: false });

  useEffect(() => {
    let cancelled = false;

    const stored = authApi.getCurrentUser();
    const token = authApi.getAccessToken();

    if (!token) {
      // Профиль без токена — остаток прошлой сессии, показываем гостя.
      if (stored) authApi.clearSession();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ user: null, ready: true });
      return;
    }

    void loadSession()
      .then((user) => {
        if (!cancelled) setState({ user, ready: true });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (isUnauthorized(error)) {
          authApi.clearSession();
          setState({ user: null, ready: true });
          return;
        }
        setState({ user: stored, ready: true });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
