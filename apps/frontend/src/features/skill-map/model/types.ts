/**
 * Отображаемый статус узла карты.
 * Вычисляется из API-полей ProfessionSkillNode: `locked` + `userStatus`
 * (см. `buildSkillGraph` в ./graph.ts).
 */
export type SkillNodeStatus = 'mastered' | 'in-progress' | 'available' | 'locked';

export type SkillMapNodeData = {
  title: string;
  subtitle: string;
  status: SkillNodeStatus;
  hours?: number | null;
  difficulty?: string;
  description?: string;
  /** Обязательные зависимости (required_prerequisites). */
  prerequisites?: string[];
  /** Рекомендованные зависимости (recommended_prerequisites). */
  recommendedPrerequisites?: string[];
  /** Навыки, которые открываются после освоения этого. */
  unlocks?: string[];
  /** Самооценка пользователя 1–5 (UserSkill.self_score). */
  selfScore?: number | null;
};

export type SkillFilter = 'all' | SkillNodeStatus | 'ahead';

/** Позиция узла на карте (значения React Flow). */
export type NodePosition = { x: number; y: number };

/** Оверрайды позиций, заданные пользователем при перетаскивании. */
export type NodePositions = Record<string, NodePosition>;
