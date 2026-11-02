import type {
  AuthResponse,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  User,
} from '@/entities/user/model/types';
import { api } from '@/shared/api';
import { authStorage } from '../model/storage';


/**
 * Флаг: когда появится реальный backend, поставить false
 * или использовать NEXT_PUBLIC_USE_MOCK_AUTH=false
 */
const USE_MOCK =
  process.env.NEXT_PUBLIC_USE_MOCK_AUTH !== 'false';

const MOCK_DELAY_MS = 600;

function delay(ms = MOCK_DELAY_MS) {
  return new Promise((r) => setTimeout(r, ms));
}

function mockUser(partial: Partial<User> & Pick<User, 'email' | 'name'>): User {
  return {
    id: partial.id || `user_${Date.now()}`,
    email: partial.email,
    name: partial.name,
    role: 'student',
    level: null,
    hours_per_week: null,
    target_profession_id: null,
    created_at: new Date().toISOString(),
  };
}

function mockTokens(): { access_token: string; refresh_token: string; token_type: string } {
  return {
    access_token: `mock_access_${Math.random().toString(36).slice(2)}`,
    refresh_token: `mock_refresh_${Math.random().toString(36).slice(2)}`,
    token_type: 'bearer',
  };
}

/** Простая in-memory «БД» для мока между перезагрузками страницы в рамках сессии */
const mockDb: { users: Array<{ email: string; password: string; user: User }> } = {
  users: [
    {
      email: 'elena.smirnova@example.com',
      password: 'password1',
      user: mockUser({
        id: 'demo-elena',
        email: 'elena.smirnova@example.com',
        name: 'Елена Смирнова',
      }),
    },
  ],
};

async function mockRegister(payload: RegisterPayload): Promise<AuthResponse> {
  await delay();
  const exists = mockDb.users.some(
    (u) => u.email.toLowerCase() === payload.email.toLowerCase()
  );
  if (exists) {
    throw Object.assign(new Error('Пользователь с таким email уже зарегистрирован'), {
      status: 409,
    });
  }
  if (payload.password.length < 8) {
    throw Object.assign(new Error('Пароль должен содержать не менее 8 символов'), {
      status: 422,
    });
  }
  const user = mockUser({ email: payload.email, name: payload.name });
  mockDb.users.push({ email: payload.email, password: payload.password, user });
  const tokens = mockTokens();
  return { ...tokens, user };
}

async function mockLogin(payload: LoginPayload): Promise<AuthResponse> {
  await delay();
  const found = mockDb.users.find(
    (u) =>
      u.email.toLowerCase() === payload.email.toLowerCase() &&
      u.password === payload.password
  );
  if (!found) {
    throw Object.assign(new Error('Неверный email или пароль'), { status: 401 });
  }
  const tokens = mockTokens();
  return { ...tokens, user: found.user };
}

async function mockForgotPassword(_payload: ForgotPasswordPayload): Promise<{ ok: true }> {
  await delay(400);
  return { ok: true };
}

// --- Public API (mock or real later) ---

export const authApi = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    if (USE_MOCK) {
      return mockRegister(payload);
    }
    return api.post<AuthResponse>('/auth/register', payload);
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    if (USE_MOCK) {
      return mockLogin(payload);
    }
    return api.post<AuthResponse>('/auth/login', {
      email: payload.email,
      password: payload.password,
    });
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<{ ok: true }> {
    if (USE_MOCK) {
      return mockForgotPassword(payload);
    }
    return api.post<{ ok: true }>('/auth/forgot-password', payload);
  },


  /** GitHub OAuth — пока заглушка: открываем /api/v1/auth/github */
  getGithubAuthUrl(mode: 'login' | 'register' = 'login'): string {
    const base = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    return `${base}/auth/github?mode=${mode}`;
  },

  /** Сохранить сессию после успешного login/register */
  persistSession(response: AuthResponse, remember = true) {
    authStorage.setSession(
      {
        access_token: response.access_token,
        refresh_token: response.refresh_token,
      },
      response.user,
      remember
    );
  },

  logout() {
    authStorage.clear();
  },

  getCurrentUser(): User | null {
    return authStorage.getUser();
  },

  getAccessToken(): string | null {
    return authStorage.getAccessToken();
  },
};
