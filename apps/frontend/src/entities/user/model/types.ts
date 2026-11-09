export type UserLevel = 'beginner' | 'intermediate' | 'advanced';
export type UserRole = 'student' | 'editor';

/** Подписи к API-значениям уровня (junior/middle/senior — только в UI). */
export const USER_LEVEL_LABELS: Record<UserLevel, string> = {
  beginner: 'Junior',
  intermediate: 'Middle',
  advanced: 'Senior',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  student: 'Студент',
  editor: 'Редактор',
};

export interface ProfessionBrief {
  id: string;
  title: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  level: UserLevel | null;
  hoursPerWeek: number | null;
  onboardingCompleted: boolean;
  isEmailVerified: boolean;
  targetProfession: ProfessionBrief | null;
}

/** Ответ /auth/login, /auth/register и /auth/refresh. */
export interface AuthTokens {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  emailVerified: boolean;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  remember?: boolean;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface MessageResponse {
  detail: string;
}

export interface UserUpdatePayload {
  name?: string;
  level?: UserLevel | null;
  hoursPerWeek?: number | null;
  targetProfessionId?: string | null;
  onboardingCompleted?: true;
}
