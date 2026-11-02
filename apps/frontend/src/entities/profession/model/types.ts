export type ProfessionDirection =
  | 'development'
  | 'analytics'
  | 'design'
  | 'infrastructure'
  | 'product';

export type ProfessionLevel = 'junior' | 'middle' | 'senior';

export interface Profession {
  id: string;
  slug: string;
  title: string;
  description: string;
  direction: ProfessionDirection;
  skills_count: number;
  hours_from_zero: number;
  level: ProfessionLevel;
  icon: 'code' | 'server' | 'layers' | 'terminal' | 'chart' | 'science' | 'pen' | 'bug' | 'cloud' | 'mobile' | 'system' | 'product';
}

export const DIRECTION_LABELS: Record<ProfessionDirection, string> = {
  development: 'Разработка',
  analytics: 'Аналитика',
  design: 'Дизайн',
  infrastructure: 'Инфраструктура',
  product: 'Продукт',
};

export const LEVEL_LABELS: Record<ProfessionLevel, string> = {
  junior: 'Junior',
  middle: 'Middle',
  senior: 'Senior',
};
