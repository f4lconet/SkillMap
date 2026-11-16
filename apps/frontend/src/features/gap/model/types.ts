import type { SkillStatus } from '@/entities/skill';

/**
 * Приоритет навыка в списке «что осталось».
 * high — ядро профессии и не заблокирован, medium — ждёт зависимостей либо
 * необязательный, low — необязательный и заблокирован.
 */
export type GapPriority = 'high' | 'medium' | 'low';

/** Строка списка пробелов — проекция GapAnalysisItem из GET /me/gap/{profession_id}. */
export interface GapRow {
  id: string;
  slug: string;
  title: string;
  status: SkillStatus;
  priority: GapPriority;
  /** Топологический ранг из API: 1 — учить первым. */
  rank: number | null;
  hoursLeft: number;
  isCore: boolean;
  locked: boolean;
}

/** Готовая к отрисовке проекция GapAnalysisResponse. */
export interface GapView {
  professionId: string;
  professionTitle: string;
  total: number;
  mastered: number;
  inProgress: number;
  notStarted: number;
  percent: number;
  hoursLeft: number;
  inProgressTitles: string[];
  masteredTitles: string[];
  /** Незакрытые навыки: сначала «в процессе», затем отсутствующие — по приоритету API. */
  rows: GapRow[];
}
