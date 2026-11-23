'use client';

import { useCallback, useEffect, useState } from 'react';
import { copyToClipboard } from '@/shared/lib/clipboard';
import { shareApi } from '../api/shareApi';
import type { ShareState } from './types';

const LOAD_ERROR = 'Не удалось загрузить настройки публичной карты.';
const ENABLE_ERROR = 'Не удалось включить публичную ссылку.';
const DISABLE_ERROR = 'Не удалось отключить публичную ссылку.';
const COPY_ERROR = 'Не удалось скопировать ссылку — скопируйте её вручную.';

export type SharePending = 'enable' | 'disable' | null;

export interface ShareController {
  state: ShareState | null;
  enabled: boolean;
  /** Ссылка на карту, пока публикация включена. */
  shareUrl: string | null;
  loading: boolean;
  pending: SharePending;
  error: string | null;
  copied: boolean;
  reload: () => Promise<void>;
  enable: () => Promise<ShareState | null>;
  disable: () => Promise<ShareState | null>;
  copyLink: (explicitUrl?: string) => Promise<boolean>;
}

function messageOf(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/** Состояние публичной ссылки пользователя: GET/POST/DELETE /me/share. */
export function useShareState(): ShareController {
  const [state, setState] = useState<ShareState | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<SharePending>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setState(await shareApi.getState());
    } catch (err) {
      setState(null);
      setError(messageOf(err, LOAD_ERROR));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Откладываем запуск на микротаск, чтобы не дёргать setState синхронно в эффекте.
    void Promise.resolve().then(() => {
      if (!cancelled) return reload();
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const shareUrl = state?.enabled ? (state.profileUrl ?? state.url) : null;

  const copyLink = useCallback(
    async (explicitUrl?: string) => {
      const url = explicitUrl ?? shareUrl;
      if (!url) return false;
      const ok = await copyToClipboard(url);
      setCopied(ok);
      if (!ok) setError(COPY_ERROR);
      return ok;
    },
    [shareUrl]
  );

  const enable = useCallback(async () => {
    setPending('enable');
    setError(null);
    setCopied(false);
    try {
      const next = await shareApi.enable();
      setState(next);
      return next;
    } catch (err) {
      setError(messageOf(err, ENABLE_ERROR));
      return null;
    } finally {
      setPending(null);
    }
  }, []);

  const disable = useCallback(async () => {
    setPending('disable');
    setError(null);
    setCopied(false);
    try {
      const next = await shareApi.disable();
      setState(next);
      return next;
    } catch (err) {
      setError(messageOf(err, DISABLE_ERROR));
      return null;
    } finally {
      setPending(null);
    }
  }, []);

  return {
    state,
    enabled: Boolean(state?.enabled),
    shareUrl,
    loading,
    pending,
    error,
    copied,
    reload,
    enable,
    disable,
    copyLink,
  };
}
