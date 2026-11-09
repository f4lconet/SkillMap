/** Статусы навыка — app/models/enums.py::SkillStatus */
export type SkillStatus = 'not_started' | 'learning' | 'mastered' | 'skipped';

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

export const SKILL_STATUS_LABELS: Record<SkillStatus, string> = {
  not_started: 'Не начат',
  learning: 'В процессе',
  mastered: 'Освоено',
  skipped: 'Пропущено',
};
