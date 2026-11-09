import type { UserLevel } from '@/entities/user';
import { USER_LEVEL_LABELS } from '@/entities/user';

export type { UserLevel };
export { USER_LEVEL_LABELS };

export type OnboardingStepId = 'goal' | 'level' | 'hours' | 'skills';

export type SkillGroup = 'basic' | 'next' | 'advanced';

export interface OnboardingSkill {
  id: string;
  title: string;
  group: SkillGroup;
  estimatedHours: number | null;
}

export interface OnboardingState {
  professionId: string;
  professionTitle: string;
  level: UserLevel;
  hoursPerWeek: number;
  selectedSkillIds: string[];
}

export const STEP_ORDER: OnboardingStepId[] = ['goal', 'level', 'hours', 'skills'];

export const STEP_LABELS: Record<OnboardingStepId, string> = {
  goal: 'Цель',
  level: 'Уровень',
  hours: 'Часы',
  skills: 'Навыки',
};
