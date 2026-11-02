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
 */

import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

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

export const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

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

function toApiError(error: unknown): ApiClientError {
  if (axios.isAxiosError(error)) {
    const ax = error as AxiosError<{ detail?: string; message?: string }>;
    const status = ax.response?.status ?? 0;
    const data = ax.response?.data;
    const message =
      (typeof data?.detail === 'string' && data.detail) ||
      (typeof data?.message === 'string' && data.message) ||
      ax.message ||
      'Request failed';
    return new ApiClientError({ status, message, details: data });
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

async function request<T>(config: RequestConfig): Promise<T> {
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
    throw toApiError(err);
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
