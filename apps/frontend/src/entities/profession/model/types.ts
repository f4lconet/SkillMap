export type ProfessionLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Profession {
  id: string;
  slug: string;
  title: string;
  direction: string;
  shortDescription: string;
  entryLevel: ProfessionLevel | null;
  skillsCount: number;
  estimatedWeeks: number;
  isPriority: boolean;
}

export interface ProfessionDetail extends Profession {
  description: string;
  tasks: string[];
  suitsIf: string[];
  startHint: string;
}

export interface ProfessionList {
  items: Profession[];
  total: number;
  limit: number;
  offset: number;
}

export const LEVEL_LABELS: Record<ProfessionLevel, string> = {
  beginner: 'Начальный',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
};
