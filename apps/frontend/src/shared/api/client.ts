/**
 * HTTP-клиент SkillMap на axios.
 *
 * Использование:
 *   import { api } from '@/shared/api';
 *   const data = await api.get<Profession[]>('/professions');
 *   await api.post('/auth/login', { email, password });
 *
 * Токен подставляется автоматически из authStorage (если есть).
 * Базовый URL: NEXT_PUBLIC_API_URL (по умолчанию /api/v1).
 *
 * Ключи в коде всегда camelCase: конвертацию в snake_case на бэкенде и обратно
 * делает axios-case-converter (см. axiosInstance ниже).
 */

import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import applyCaseMiddleware from 'axios-case-converter';

export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}

export class ApiClientError extends Error {
  status: number;
  details?: unknown;

  constructor({ status, message, details }: ApiError) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
  }
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '/api/v1';

/**
 * snake_case <-> camelCase на границе с бэкендом:
 * исходящие `data`/`params` уходят в snake_case, ответы приходят в camelCase.
 * Заголовки не трогаем — Authorization/Content-Type выставляем сами.
 */
export const axiosInstance: AxiosInstance = applyCaseMiddleware(
  axios.create({
    baseURL: API_BASE,
    timeout: 15_000,
    // refresh-токен передаётся httpOnly-cookie на /api/v1/auth
    withCredentials: true,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  }),
  { ignoreHeaders: true }
);

/** Лениво читаем токен, чтобы не тянуть auth в circular import на SSR */
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { authStorage } = require('@/features/auth/model/storage') as {
      authStorage: { getAccessToken: () => string | null };
    };
    return authStorage.getAccessToken();
  } catch {
    return (
      localStorage.getItem('skillmap_access_token') ||
      sessionStorage.getItem('skillmap_access_token')
    );
  }
}

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type ApiErrorBody = {
  detail?: string | Array<{ msg?: string; loc?: Array<string | number> }>;
  errors?: Array<{ field?: string; message?: string }>;
  message?: string;
};

function extractMessage(data: ApiErrorBody | undefined, fallback: string): string {
  if (!data) return fallback;
  if (typeof data.detail === 'string' && data.detail) return data.detail;
  if (Array.isArray(data.errors) && data.errors.length > 0) {
    const first = data.errors[0];
    if (first?.message) {
      return first.field ? `${first.field}: ${first.message}` : first.message;
    }
  }
  if (Array.isArray(data.detail) && data.detail.length > 0) {
    const first = data.detail[0];
    if (first?.msg) return first.msg;
  }
  if (typeof data.message === 'string' && data.message) return data.message;
  return fallback;
}

function toApiError(error: unknown): ApiClientError {
  if (axios.isAxiosError(error)) {
    const ax = error as AxiosError<ApiErrorBody>;
    const status = ax.response?.status ?? 0;
    const data = ax.response?.data;
    return new ApiClientError({
      status,
      message: extractMessage(data, ax.message || 'Request failed'),
      details: data,
    });
  }
  if (error instanceof ApiClientError) return error;
  return new ApiClientError({
    status: 0,
    message: error instanceof Error ? error.message : 'Unknown error',
  });
}

type RequestConfig = AxiosRequestConfig & {
  /** Явно передать токен (иначе берётся из storage) */
  token?: string | null;
};

/** Обновляет access-токен по httpOnly-cookie. Возвращает null, если сессии нет. */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await axiosInstance.post<{ accessToken: string }>('/auth/refresh');
    const token = res.data?.accessToken;
    if (!token) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { authStorage } = require('@/features/auth/model/storage') as {
        authStorage: { setAccessToken: (value: string) => void };
      };
      authStorage.setAccessToken(token);
    } catch {
      /* storage недоступен на SSR */
    }
    return token;
  } catch {
    return null;
  }
}

async function request<T>(config: RequestConfig, isRetry = false): Promise<T> {
  try {
    const { token, ...rest } = config;
    const res = await axiosInstance.request<T>({
      ...rest,
      headers: {
        ...rest.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return res.data;
  } catch (err) {
    const apiError = toApiError(err);
    const isAuthRoute = config.url?.startsWith('/auth/') ?? false;
    if (apiError.status === 401 && !isRetry && !isAuthRoute && !config.token) {
      const token = await refreshAccessToken();
      if (token) return request<T>(config, true);
    }
    throw apiError;
  }
}

export const api = {
  get: <T>(url: string, config?: RequestConfig) =>
    request<T>({ ...config, method: 'GET', url }),

  post: <T>(url: string, data?: unknown, config?: RequestConfig) =>
    request<T>({ ...config, method: 'POST', url, data }),

  put: <T>(url: string, data?: unknown, config?: RequestConfig) =>
    request<T>({ ...config, method: 'PUT', url, data }),

  patch: <T>(url: string, data?: unknown, config?: RequestConfig) =>
    request<T>({ ...config, method: 'PATCH', url, data }),

  delete: <T>(url: string, config?: RequestConfig) =>
    request<T>({ ...config, method: 'DELETE', url }),

  /** Прямой доступ к axios instance при необходимости */
  instance: axiosInstance,
};
