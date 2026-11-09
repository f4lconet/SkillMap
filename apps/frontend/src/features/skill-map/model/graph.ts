import type { Edge, Node } from '@xyflow/react';
import type { ProfessionMap, ProfessionSkillNode } from '@/entities/skill';
import type { SkillMapNodeData, SkillNodeStatus } from './types';

/**
 * Шаг сетки: колонка = слой (`layer`), ряд = порядок внутри слоя.
 * Высота карточки навыка в worst case ~142px, поэтому ROW_HEIGHT даёт
 * зазор ~18–30px и узлы не перекрываются, но раскладка остаётся плотной.
 * Ширина карточки ≤180px — колонка в 300px оставляет место для связей.
 */
const COLUMN_WIDTH = 300;
const ROW_HEIGHT = 160;

/**
 * Цвет статуса узла. Используется для рёбер: связь окрашивается
 * в цвет узла, в который она входит.
 */
export const nodeStatusColor: Record<SkillNodeStatus, string> = {
  mastered: '#218166',
  'in-progress': '#5357D9',
  available: '#A66B17',
  locked: '#C5CBD6',
};

export interface SkillGraph {
  nodes: Node<SkillMapNodeData>[];
  edges: Edge[];
}

export function difficultyLabel(difficulty: number): string {
  if (difficulty <= 2) return 'Лёгкая';
  if (difficulty === 3) return 'Средняя';
  return 'Сложная';
}

function toNodeStatus(skill: ProfessionSkillNode): SkillNodeStatus {
  if (skill.locked) return 'locked';
  if (skill.userStatus === 'mastered') return 'mastered';
  if (skill.userStatus === 'learning') return 'in-progress';
  return 'available';
}

/**
 * Строит граф React Flow из ответа GET /professions/{id}/map.
 * Позиция узла: колонка = `layer`, ряд = порядок `position` внутри слоя.
 */
export function buildSkillGraph(map: ProfessionMap | null): SkillGraph {
  if (!map || map.skills.length === 0) {
    return { nodes: [], edges: [] };
  }

  const knownIds = new Set(map.skills.map((s) => s.id));

  const unlocks = new Map<string, string[]>();
  for (const skill of map.skills) {
    for (const dep of [
      ...skill.requiredPrerequisites,
      ...skill.recommendedPrerequisites,
    ]) {
      const list = unlocks.get(dep.id) ?? [];
      list.push(skill.title);
      unlocks.set(dep.id, list);
    }
  }

  const byLayer = new Map<number, ProfessionSkillNode[]>();
  for (const skill of map.skills) {
    const list = byLayer.get(skill.layer) ?? [];
    list.push(skill);
    byLayer.set(skill.layer, list);
  }

  const nodes: Node<SkillMapNodeData>[] = [];
  const statusById = new Map<string, SkillNodeStatus>();
  for (const [layer, items] of [...byLayer.entries()].sort((a, b) => a[0] - b[0])) {
    const ordered = [...items].sort((a, b) => a.position - b.position);
    const top = -((ordered.length - 1) * ROW_HEIGHT) / 2;
    ordered.forEach((skill, index) => {
      const status = toNodeStatus(skill);
      statusById.set(skill.id, status);
      nodes.push({
        id: skill.id,
        type: 'skill',
        position: { x: layer * COLUMN_WIDTH, y: top + index * ROW_HEIGHT },
        data: {
          title: skill.title,
          subtitle: skill.category || difficultyLabel(skill.difficulty),
          status,
          hours: skill.estimatedHours,
          difficulty: difficultyLabel(skill.difficulty),
          description: skill.description,
          prerequisites: skill.requiredPrerequisites.map((d) => d.title),
          recommendedPrerequisites: skill.recommendedPrerequisites.map(
            (d) => d.title
          ),
          unlocks: unlocks.get(skill.id) ?? [],
          selfScore: skill.selfScore,
        },
      });
    });
  }

  const edges: Edge[] = [];
  for (const skill of map.skills) {
    const color = nodeStatusColor[statusById.get(skill.id) ?? 'available'];
    for (const dep of skill.requiredPrerequisites) {
      if (!knownIds.has(dep.id)) continue;
      edges.push({
        id: `${dep.id}->${skill.id}`,
        source: dep.id,
        target: skill.id,
        style: { stroke: color },
      });
    }
    for (const dep of skill.recommendedPrerequisites) {
      if (!knownIds.has(dep.id)) continue;
      edges.push({
        id: `rec:${dep.id}->${skill.id}`,
        source: dep.id,
        target: skill.id,
        style: { stroke: color, strokeDasharray: '5 5' },
      });
    }
  }

  return { nodes, edges };
}
