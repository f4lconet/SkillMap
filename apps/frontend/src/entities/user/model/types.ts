export type UserLevel = 'beginner' | 'intermediate' | 'advanced';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'editor' | 'admin';
  level?: UserLevel | null;
  hours_per_week?: number | null;
  target_profession_id?: string | null;
  created_at?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type?: string;
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
