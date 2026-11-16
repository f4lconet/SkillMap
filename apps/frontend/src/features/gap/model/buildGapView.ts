import type { GapAnalysis, GapAnalysisItem } from '@/entities/skill';
import type { GapPriority, GapRow, GapView } from './types';

/** API отдаёт только топологический ранг, поэтому приоритет выводим из ядра и блокировки. */
function toPriority(item: GapAnalysisItem): GapPriority {
  if (item.isCore) return item.locked ? 'medium' : 'high';
  return item.locked ? 'low' : 'medium';
}

function toRow(item: GapAnalysisItem): GapRow {
  return {
    id: item.skill.id,
    slug: item.skill.slug,
    title: item.skill.title,
    status: item.status,
    priority: toPriority(item),
    rank: item.priority ?? null,
    hoursLeft: item.skill.estimatedHours ?? 0,
    isCore: item.isCore,
    locked: item.locked,
  };
}

export function buildGapView(gap: GapAnalysis): GapView {
  return {
    professionId: gap.professionId,
    professionTitle: gap.professionTitle,
    total: gap.totalSkills,
    mastered: gap.mastered.length,
    inProgress: gap.learning.length,
    notStarted: gap.missing.length,
    percent: Math.round(gap.matchPercent ?? gap.progressPercent),
    hoursLeft: gap.estimatedRemainingHours ?? 0,
    inProgressTitles: gap.learning.map((item) => item.skill.title),
    masteredTitles: gap.mastered.map((item) => item.skill.title),
    // missing уже отсортирован бэкендом по приоритету обучения.
    rows: [...gap.learning.map(toRow), ...gap.missing.map(toRow)],
  };
}
