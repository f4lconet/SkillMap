'use client';

import Link from 'next/link';
import {
  type Profession,
  DIRECTION_LABELS,
  LEVEL_LABELS,
} from '@/entities/profession';
import { Button, Badge } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { ProfessionIcon } from './ProfessionIcon';

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
  const { id, slug, title, description, direction, skills_count, hours_from_zero, level, icon } =
    profession;

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
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            selected ? 'bg-accent-soft text-accent' : 'bg-page text-secondary'
          )}
        >
          <ProfessionIcon name={icon} />
        </div>
        {selected ? (
          <Badge variant="success">Ваша цель</Badge>
        ) : (
          <span className="rounded-full bg-page px-2.5 py-1 text-helper text-secondary">
            {DIRECTION_LABELS[direction]}
          </span>
        )}
      </div>

      <h3 className="text-section text-text">{title}</h3>
      <p className="mt-1.5 flex-1 text-body text-secondary">{description}</p>
      <p className="mt-3 text-helper text-secondary">
        {skills_count} навыков · {hours_from_zero} ч с нуля · {LEVEL_LABELS[level]}
      </p>

      <div className="mt-4 flex items-center gap-2">
        <Link
          href={`/demo?profession=${slug}`}
          className="text-helper font-medium text-accent hover:underline"
        >
          Посмотреть карту ↗
        </Link>
        <div className="flex-1" />
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
