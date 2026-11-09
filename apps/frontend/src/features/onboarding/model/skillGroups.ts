import type { ProfessionSkillNode } from '@/entities/skill';
import type { OnboardingSkill, SkillGroup } from './types';

/** Слой узла на карте → блок в списке навыков онбординга. */
function toGroup(layer: number): SkillGroup {
  if (layer <= 0) return 'basic';
  if (layer === 1) return 'next';
  return 'advanced';
}

/** Узлы карты профессии → плоский список навыков для шага «Что вы умеете». */
export function toOnboardingSkills(
  nodes: ProfessionSkillNode[]
): OnboardingSkill[] {
  return [...nodes]
    .sort(
      (a, b) =>
        a.layer - b.layer || a.difficulty - b.difficulty || a.position - b.position
    )
    .map((node) => ({
      id: node.id,
      title: node.title,
      group: toGroup(node.layer),
      estimatedHours: node.estimatedHours,
    }));
}

/** Навыки, уже отмеченные пользователем как освоенные. */
export function masteredSkillIds(nodes: ProfessionSkillNode[]): string[] {
  return nodes.filter((n) => n.userStatus === 'mastered').map((n) => n.id);
}
