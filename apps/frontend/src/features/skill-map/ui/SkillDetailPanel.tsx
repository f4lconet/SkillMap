'use client';

import { useState } from 'react';
import { Button, Badge, Progress } from '@/shared/ui';
import type { SkillStatus } from '@/entities/skill';
import type { SkillMapNodeData, SkillNodeStatus } from '../model/types';

type Props = {
  data: SkillMapNodeData;
  saving?: boolean;
  onClose: () => void;
  onSetStatus: (status: SkillStatus) => void;
};

const statusBadge: Record<
  SkillNodeStatus,
  { variant: 'success' | 'in-progress' | 'available' | 'locked'; label: string }
> = {
  mastered: { variant: 'success', label: 'Освоено' },
  'in-progress': { variant: 'in-progress', label: 'В процессе' },
  available: { variant: 'available', label: 'Можно начать' },
  locked: { variant: 'locked', label: 'Недоступен' },
};

export function SkillDetailPanel({ data, saving, onClose, onSetStatus }: Props) {
  const badge = statusBadge[data.status];
  const [detailsHint, setDetailsHint] = useState(false);

  return (
    <aside className="flex h-full w-full flex-col rounded-2xl border border-border bg-surface p-5 shadow-soft lg:w-[300px]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
          Выбранный навык
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-secondary hover:bg-page hover:text-text"
          aria-label="Закрыть"
        >
          ✕
        </button>
      </div>

      <h2 className="mt-2 text-h3 leading-tight text-text">{data.title}</h2>
      {data.subtitle && data.title !== data.subtitle && (
        <p className="mt-0.5 text-body text-secondary">{data.subtitle}</p>
      )}

      <div className="mt-3">
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      {data.description && (
        <p className="mt-4 text-body leading-relaxed text-secondary">
          {data.description}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {data.difficulty && (
          <span className="rounded-full bg-[#FFF8E8] px-2.5 py-1 text-helper font-medium text-warning">
            {data.difficulty}
          </span>
        )}
        {data.hours != null && (
          <span className="rounded-full bg-page px-2.5 py-1 text-helper font-medium text-secondary">
            {data.hours} часов
          </span>
        )}
        {data.selfScore != null && (
          <span className="rounded-full bg-page px-2.5 py-1 text-helper font-medium text-secondary">
            Самооценка: {data.selfScore}/5
          </span>
        )}
      </div>

      {data.status === 'mastered' && (
        <div className="mt-4">
          <Progress value={100} label="Навык освоен" size="sm" />
        </div>
      )}

      <div className="mt-4 space-y-1 text-helper text-secondary">
        {data.prerequisites && data.prerequisites.length > 0 && (
          <p>
            <span className="text-text">Основа:</span>{' '}
            {data.prerequisites.join(', ')} ✓
          </p>
        )}
        {data.recommendedPrerequisites &&
          data.recommendedPrerequisites.length > 0 && (
            <p>
              <span className="text-text">Рекомендуется:</span>{' '}
              {data.recommendedPrerequisites.join(', ')}
            </p>
          )}
        {data.unlocks && data.unlocks.length > 0 && (
          <p>
            <span className="text-text">Открывает:</span> {data.unlocks.join(', ')}
          </p>
        )}
      </div>

      <div className="mt-auto space-y-2 pt-6">
        <Button
          variant="secondary"
          className="w-full"
          title="Скоро"
          onClick={() => setDetailsHint((v) => !v)}
        >
          Подробнее о навыке
        </Button>
        {detailsHint && (
          <p className="rounded-xl border border-border bg-page px-3 py-2 text-center text-helper text-secondary">
            Подробная информация о навыке скоро появится — раздел в разработке.
          </p>
        )}
        {data.status === 'available' && (
          <Button
            variant="primary"
            className="w-full"
            disabled={saving}
            onClick={() => onSetStatus('learning')}
          >
            {saving ? 'Сохраняем…' : '▶ Начать'}
          </Button>
        )}
        {data.status === 'in-progress' && (
          <Button
            variant="primary"
            className="w-full"
            disabled={saving}
            onClick={() => onSetStatus('mastered')}
          >
            {saving ? 'Сохраняем…' : '✓ Отметить освоенным'}
          </Button>
        )}
        {data.status === 'mastered' && (
          <Button variant="secondary" className="w-full" disabled>
            ✓ Уже освоено
          </Button>
        )}
        {data.status === 'locked' && (
          <p className="text-center text-helper text-secondary">
            Сначала закройте зависимости
          </p>
        )}
      </div>
    </aside>
  );
}
