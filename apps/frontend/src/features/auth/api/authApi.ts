import type {
  AuthResponse,
  AuthTokens,
  ForgotPasswordPayload,
  LoginPayload,
  MessageResponse,
  RegisterPayload,
  User,
} from '@/entities/user/model/types';
import { api } from '@/shared/api';
import { authStorage } from '../model/storage';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Backend отдаёт токены без пользователя — профиль читаем отдельным запросом. */
async function loadUser(accessToken: string): Promise<User> {
  return api.get<User>('/me', { token: accessToken });
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const tokens = await api.post<AuthTokens>('/auth/register', {
      name: payload.name.trim(),
      email: normalizeEmail(payload.email),
      password: payload.password,
    });
    const user = await loadUser(tokens.accessToken);
    return { ...tokens, user };
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const tokens = await api.post<AuthTokens>('/auth/login', {
      email: normalizeEmail(payload.email),
      password: payload.password,
    });
    const user = await loadUser(tokens.accessToken);
    return { ...tokens, user };
  },

  /** Возвращает сообщение бэкенда для показа пользователю. */
  async forgotPassword(payload: ForgotPasswordPayload): Promise<string> {
    const response = await api.post<MessageResponse>('/auth/password-reset/request', {
      email: normalizeEmail(payload.email),
    });
    return response.detail;
  },

  async logout(): Promise<void> {
    try {
      await api.post<void>('/auth/logout');
    } finally {
      authStorage.clear();
    }
  },

  /** Загружает актуальный профиль и обновляет сохранённого пользователя. */
  async me(): Promise<User> {
    const user = await api.get<User>('/me');
    authStorage.updateUser(user);
    return user;
  },

  /** Сохраняет выбранную профессию как цель пользователя. */
  async setTargetProfession(professionId: string): Promise<User> {
    const user = await api.patch<User>('/me', { targetProfessionId: professionId });
    authStorage.updateUser(user);
    return user;
  },

  /** Сохранить сессию после успешного login/register. */
  persistSession(response: AuthResponse, remember = true) {
    authStorage.setSession(response.accessToken, response.user, remember);
  },

  getCurrentUser(): User | null {
    return authStorage.getUser();
  },

  getAccessToken(): string | null {
    return authStorage.getAccessToken();
  },
};
