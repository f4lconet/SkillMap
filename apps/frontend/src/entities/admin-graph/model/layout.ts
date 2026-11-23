import type { AdminGraphNode, PublishStatus } from './types';

/**
 * Шаг сетки такой же, как на студенческой карте (features/skill-map/model/graph),
 * чтобы черновик в редакторе выглядел как финальная карта.
 */
export const COLUMN_WIDTH = 300;
export const ROW_HEIGHT = 160;

export type NodePosition = { x: number; y: number };

/**
 * Позиция узла: сохранённые координаты редактора (`posX`/`posY`),
 * иначе авто-раскладка «колонка = layer, ряд = порядок внутри слоя».
 */
export function buildNodePositions(
  nodes: AdminGraphNode[]
): Map<string, NodePosition> {
  const byLayer = new Map<number, AdminGraphNode[]>();
  for (const node of nodes) {
    const list = byLayer.get(node.layer) ?? [];
    list.push(node);
    byLayer.set(node.layer, list);
  }

  const positions = new Map<string, NodePosition>();
  for (const [layer, items] of byLayer) {
    const ordered = [...items].sort(
      (a, b) => a.position - b.position || a.title.localeCompare(b.title)
    );
    const top = -((ordered.length - 1) * ROW_HEIGHT) / 2;
    ordered.forEach((node, index) => {
      positions.set(node.id, {
        x: node.posX ?? layer * COLUMN_WIDTH,
        y: node.posY ?? top + index * ROW_HEIGHT,
      });
    });
  }
  return positions;
}

/** Сложность 1..5 — так она хранится на бэкенде. */
export const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Лёгкая',
  2: 'Ниже средней',
  3: 'Средняя',
  4: 'Выше средней',
  5: 'Сложная',
};

export const DIFFICULTY_OPTIONS = [1, 2, 3, 4, 5];

export function difficultyLabel(difficulty: number): string {
  return DIFFICULTY_LABELS[difficulty] ?? `Сложность ${difficulty}`;
}

export const PUBLISH_LABELS: Record<PublishStatus, string> = {
  published: 'Опубликован',
  modified: 'Есть изменения',
  new: 'Новый',
  draft: 'Черновик',
};

export const PROFESSION_LEVEL_LABELS: Record<string, string> = {
  beginner: 'Начальный',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
};

export const PROFESSION_LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Начальный' },
  { value: 'intermediate', label: 'Средний' },
  { value: 'advanced', label: 'Продвинутый' },
];

export const DEPENDENCY_LABELS: Record<'required' | 'recommended', string> = {
  required: 'Обязательная',
  recommended: 'Рекомендуемая',
};

/** Дата из ISO-строки в формате «20 октября 2026». */
export function formatDate(iso: string | null, fallback = '—'): string {
  if (!iso) return fallback;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Дата и время — для «черновик сохранён в …». */
export function formatDateTime(iso: string | null, fallback = '—'): string {
  if (!iso) return fallback;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}
