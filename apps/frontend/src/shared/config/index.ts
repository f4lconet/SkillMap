import { colors } from './colors';

export { colors, focusRing } from './colors';
export type { ColorToken } from './colors';

/** Маршруты приложения (Next.js App Router). */
export const ROUTES = {
  home: '/',
  auth: '/auth',
  catalog: '/catalog',
  onboarding: '/onboarding',
  map: '/map',
  gap: '/gap',
  trajectory: '/trajectory',
  dashboard: '/dashboard',
  profile: '/profile',
  admin: '/admin',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

/** Цвета графиков (SVG/recharts) на основе токенов UI-кита. */
export const CHART_COLORS = {
  accent: colors.accent,
  accentSoftBar: '#C7C8F3',
  mutedBar: colors.border,
  grid: colors.border,
  axisText: colors.secondary,
  white: colors.surface,
} as const;
