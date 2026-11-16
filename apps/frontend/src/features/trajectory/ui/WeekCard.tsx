'use client';

import { cn } from '@/shared/lib/cn';
import type { TrajectoryWeek, TrajectoryWeekItem } from '@/entities/skill';
import { SkillCheck } from './SkillCheck';

function ItemRow({
  item,
  saving,
  onToggle,
}: {
  item: TrajectoryWeekItem;
  saving: boolean;
  onToggle: () => void;
}) {
  const mastered = item.status === 'done';
  const learning = item.status === 'in_progress';

  return (
    <div className="flex items-start gap-3 border-t border-border py-3.5 first:border-t-0 first:pt-0">
      <SkillCheck
        checked={mastered}
        disabled={saving}
        label={item.skill.title}
        onToggle={onToggle}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-body font-medium',
            mastered ? 'text-secondary line-through' : 'text-text'
          )}
        >
          {item.skill.title}
        </p>
        <p className="mt-0.5 text-helper text-secondary">
          {item.skill.category}
          {item.resources.length > 0 && ` · материалов: ${item.resources.length}`}
        </p>
        {learning && (
          <span className="mt-2 inline-flex rounded-full bg-accent-soft px-2.5 py-1 text-helper font-medium text-accent">
            В процессе
          </span>
        )}
      </div>
      <span className="shrink-0 text-helper font-medium text-secondary">
        {item.hours} ч
      </span>
    </div>
  );
}

type Props = {
  week: TrajectoryWeek;
  isCurrent: boolean;
  expanded: boolean;
  onToggle: () => void;
  onToggleItem: (itemId: string) => void;
  savingItemId: string | null;
};

export function WeekCard({
  week,
  isCurrent,
  expanded,
  onToggle,
  onToggleItem,
  savingItemId,
}: Props) {
  const doneHours = week.items.reduce(
    (sum, item) => (item.status === 'done' ? sum + item.hours : sum),
    0
  );
  const progress = week.estimatedHours
    ? Math.min(100, Math.round((doneHours / week.estimatedHours) * 100))
    : 0;
  const skillsLabel = `${week.items.length} ${skillsWord(week.items.length)}`;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface px-5 py-4 text-left transition-colors hover:border-secondary/40"
      >
        <span className="text-secondary">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold text-text">
            {week.title} · {week.focus}
          </p>
          <p className="mt-0.5 truncate text-helper text-secondary">
            {skillsLabel} · {doneHours} из {week.estimatedHours} ч
          </p>
        </div>
        {isCurrent && (
          <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-helper font-semibold text-accent">
            Сейчас
          </span>
        )}
        <span className="shrink-0 rounded-full bg-page px-2.5 py-1 text-helper font-medium text-secondary">
          {week.estimatedHours} ч
        </span>
        <span className="text-secondary">▾</span>
      </button>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-accent/30 bg-surface p-5 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-section text-text">
            {week.title} · {week.focus}
          </h3>
          <p className="mt-0.5 text-helper text-secondary">
            {skillsLabel} · {week.estimatedHours} ч
          </p>
        </div>
        {isCurrent && (
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-helper font-semibold text-accent">
            Сейчас
          </span>
        )}
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4">
        {week.items.map((item) => (
          <ItemRow
            key={item.skill.id}
            item={item}
            saving={savingItemId === item.itemId}
            onToggle={() => onToggleItem(item.itemId ?? '')}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="mt-3 cursor-pointer text-helper font-medium text-secondary transition-colors hover:text-accent"
      >
        Свернуть неделю ↑
      </button>
    </div>
  );
}

function skillsWord(count: number): string {
  if (count % 10 === 1 && count % 100 !== 11) return 'навык';
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
    return 'навыка';
  }
  return 'навыков';
}
