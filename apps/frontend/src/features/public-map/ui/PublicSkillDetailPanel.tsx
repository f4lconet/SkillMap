'use client';

import { Badge } from '@/shared/ui';
import type { SkillMapNodeData, SkillNodeStatus } from '@/features/skill-map';

type Props = {
  data: SkillMapNodeData | null;
  /** Подпись внизу панели: публичная карта или демо-режим. */
  note?: string;
};

const DEFAULT_NOTE = 'Публичная карта доступна только для просмотра.';

const statusBadge: Record<
  SkillNodeStatus,
  { variant: 'success' | 'in-progress' | 'available' | 'locked'; label: string }
> = {
  mastered: { variant: 'success', label: 'Освоено' },
  'in-progress': { variant: 'in-progress', label: 'В процессе' },
  available: { variant: 'available', label: 'Можно начать' },
  locked: { variant: 'locked', label: 'Недоступен' },
};

export function PublicSkillDetailPanel({ data, note }: Props) {
  if (!data) {
    return (
      <aside className="flex h-full flex-col rounded-2xl border border-border bg-surface p-5 shadow-soft">
        <p className="text-body text-secondary">
          Выберите навык на карте, чтобы увидеть описание и связи.
        </p>
      </aside>
    );
  }

  const badge = statusBadge[data.status];

  return (
    <aside className="flex h-full flex-col rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <h2 className="text-section leading-snug text-text">{data.title}</h2>

      <div className="mt-3">
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      {data.description && (
        <p className="mt-4 text-body leading-relaxed text-secondary">
          {data.description}
        </p>
      )}

      {data.prerequisites && data.prerequisites.length > 0 && (
        <div className="mt-5">
          <p className="text-helper font-medium text-secondary">Зависит от</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {data.prerequisites.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-helper font-medium text-success"
              >
                <span>✓</span> {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.unlocks && data.unlocks.length > 0 && (
        <div className="mt-4">
          <p className="text-helper font-medium text-secondary">Ведёт к</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {data.unlocks.map((name) => (
              <span
                key={name}
                className="rounded-full bg-page px-2.5 py-1 text-helper font-medium text-secondary"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto rounded-xl bg-accent-soft/70 px-3.5 py-3 text-helper leading-relaxed text-secondary">
        <span className="mr-1.5 inline-block align-middle text-accent">◎</span>
        {note ?? DEFAULT_NOTE}
      </div>
    </aside>
  );
}