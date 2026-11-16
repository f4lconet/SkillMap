/** Статус навыка — app/models/enums.py::SkillStatus */
export type SkillStatus = 'not_started' | 'learning' | 'mastered' | 'skipped';

/** Статус пункта плана — app/models/enums.py::PlanItemStatus */
export type PlanItemStatus = 'planned' | 'in_progress' | 'done';

export type DependencyType = 'required' | 'recommended';

export interface PrerequisiteRef {
  id: string;
  slug: string;
  title: string;
  depType: DependencyType;
}

/** app/schemas/skill.py::ProfessionSkillNode */
export interface ProfessionSkillNode {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: number;
  layer: number;
  estimatedHours: number | null;
  position: number;
  isCore: boolean;
  requiredPrerequisites: PrerequisiteRef[];
  recommendedPrerequisites: PrerequisiteRef[];
  userStatus: SkillStatus | null;
  selfScore: number | null;
  locked: boolean;
}

/** app/schemas/skill.py::ProfessionMapResponse */
export interface ProfessionMap {
  professionId: string;
  professionTitle: string;
  skillsReady: boolean;
  skills: ProfessionSkillNode[];
  totalSkills: number;
  masteredCount: number;
  learningCount: number;
  progressPercent: number;
}

/** app/schemas/skill.py::UserSkillRead */
export interface UserSkill {
  skillId: string;
  status: SkillStatus;
  selfScore: number | null;
}

/** app/schemas/skill.py::SkillBrief */
export interface SkillBrief {
  id: string;
  slug: string;
  title: string;
  category: string;
  difficulty: number;
  layer: number;
  estimatedHours: number | null;
}

/** app/schemas/skill.py::GapAnalysisItem */
export interface GapAnalysisItem {
  skill: SkillBrief;
  status: SkillStatus;
  isCore: boolean;
  position: number;
  locked: boolean;
}

/** app/schemas/skill.py::GapAnalysisResponse */
export interface GapAnalysis {
  professionId: string;
  professionTitle: string;
  totalSkills: number;
  mastered: GapAnalysisItem[];
  learning: GapAnalysisItem[];
  missing: GapAnalysisItem[];
  progressPercent: number;
  estimatedRemainingHours: number | null;
}

/** app/schemas/skill.py::ResourceBrief */
export interface ResourceBrief {
  id: string;
  title: string;
  url: string;
  resourceType: string;
  isFree: boolean;
  provider: string;
  estimatedHours: number | null;
}

/** app/schemas/skill.py::TrajectoryWeekItem */
export interface TrajectoryWeekItem {
  skill: SkillBrief;
  hours: number;
  resources: ResourceBrief[];
  status: PlanItemStatus;
  /** id сохранённого пункта плана — для PATCH /me/plan/items/{itemId} */
  itemId: string | null;
}

/** app/schemas/skill.py::PlanItemRead */
export interface PlanItem {
  id: string;
  planId: string;
  skillId: string;
  weekNumber: number;
  estimatedHours: number;
  position: number;
  status: PlanItemStatus;
}

/** app/schemas/skill.py::TrajectoryWeek */
export interface TrajectoryWeek {
  week: number;
  title: string;
  items: TrajectoryWeekItem[];
  /** @deprecated дублирует items — оставлено для обратной совместимости API */
  skills: SkillBrief[];
  estimatedHours: number;
  focus: string;
}

/** app/schemas/skill.py::TrajectoryResponse */
export interface Trajectory {
  professionId: string;
  professionTitle: string;
  level: string | null;
  hoursPerWeek: number;
  totalWeeks: number;
  currentWeek: number;
  weeks: TrajectoryWeek[];
  whatToDoThisWeek: TrajectoryWeekItem[];
}

export const SKILL_STATUS_LABELS: Record<SkillStatus, string> = {
  not_started: 'Не начат',
  learning: 'В процессе',
  mastered: 'Освоено',
  skipped: 'Пропущено',
};
