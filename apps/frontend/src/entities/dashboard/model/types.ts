import type { ResourceBrief, SkillBrief } from '@/entities/skill';

/** app/schemas/skill.py::DashboardKpi */
export interface DashboardKpi {
  masteredCount: number;
  learningCount: number;
  totalSkills: number;
  progressPercent: number;
  estimatedRemainingHours: number | null;
  hoursPerWeek: number | null;
  level: string | null;
  targetProfessionTitle: string | null;
}

/** app/schemas/skill.py::DashboardNextStep */
export interface DashboardNextStep {
  skill: SkillBrief;
  reason: string;
  resources: ResourceBrief[];
}

/** app/schemas/skill.py::DashboardProgressPoint */
export interface DashboardProgressPoint {
  label: string;
  /** Доля освоенных навыков на конец недели, %. */
  value: number;
  mastered: number;
}

export type AchievementKind = 'check' | 'time' | 'flag';

/** app/schemas/skill.py::DashboardAchievement */
export interface DashboardAchievement {
  kind: AchievementKind;
  date: string;
  text: string;
}

/** app/schemas/skill.py::DashboardDayHours */
export interface DashboardDayHours {
  day: string;
  hours: number;
  current: boolean;
}

/** app/schemas/skill.py::DashboardWeekActivity */
export interface DashboardWeekActivity {
  label: string;
  days: DashboardDayHours[];
  hoursDone: number;
  hoursGoal: number;
}

/** app/schemas/skill.py::DashboardResponse */
export interface Dashboard {
  kpi: DashboardKpi;
  nextSteps: DashboardNextStep[];
  statusBreakdown: Record<string, number>;
  currentWeekFocus: string | null;
  progressHistory: DashboardProgressPoint[];
  recentAchievements: DashboardAchievement[];
  weekActivity: DashboardWeekActivity | null;
}
