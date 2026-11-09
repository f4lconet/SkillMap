'use client';

import { useEffect, useState } from 'react';
import type { User } from '@/entities/user';
import { authApi } from '../api/authApi';

export interface SessionUser {
  user: User | null;
  /** false, пока сессия не прочитана из storage — UI не показывает гостевые кнопки раньше времени. */
  ready: boolean;
}

/** Текущий пользователь на клиенте: из storage, при необходимости — через GET /me. */
export function useSessionUser(): SessionUser {
  const [state, setState] = useState<SessionUser>({ user: null, ready: false });

  useEffect(() => {
    let cancelled = false;

    // Синхронная часть: storage недоступен на сервере, поэтому читать его можно
    // только после гидрации — иначе получим mismatch разметки.
    const stored = authApi.getCurrentUser();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ user: stored, ready: true });
      return;
    }

    if (!authApi.getAccessToken()) {
      setState({ user: null, ready: true });
      return;
    }

    // Токен есть, а профиль в storage потерян — дозагружаем его.
    void authApi
      .me()
      .then((user) => {
        if (!cancelled) setState({ user, ready: true });
      })
      .catch(() => {
        if (!cancelled) setState({ user: null, ready: true });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
