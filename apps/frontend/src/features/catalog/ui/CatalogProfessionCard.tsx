'use client';

import { type Profession, LEVEL_LABELS } from '@/entities/profession';
import { Button, Badge } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';

type Props = {
  profession: Profession;
  selected?: boolean;
  onSelect?: (id: string) => void;
};

export function CatalogProfessionCard({
  profession,
  selected = false,
  onSelect,
}: Props) {
  const {
    id,
    title,
    shortDescription,
    direction,
    skillsCount,
    estimatedWeeks,
    entryLevel,
  } = profession;

  return (
    <article
      className={cn(
        'flex flex-col rounded-2xl border bg-surface p-5 transition-all duration-200',
        selected
          ? 'border-2 border-accent shadow-soft'
          : 'border-border hover:border-[#D0D5E0] hover:shadow-soft'
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="rounded-full bg-page px-2.5 py-1 text-helper text-secondary">
          {direction}
        </span>
        {selected && <Badge variant="success">Ваша цель</Badge>}
      </div>

      <h3 className="text-section text-text">{title}</h3>
      <p className="mt-1.5 flex-1 text-body text-secondary">{shortDescription}</p>
      <p className="mt-3 text-helper text-secondary">
        {skillsCount > 0 ? `${skillsCount} навыков · ` : ''}≈{estimatedWeeks} нед.
        {entryLevel ? ` · ${LEVEL_LABELS[entryLevel]}` : ''}
      </p>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button
          variant={selected ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => onSelect?.(id)}
        >
          {selected ? '✓ Выбрано' : 'Выбрать цель'}
        </Button>
      </div>
    </article>
  );
}
