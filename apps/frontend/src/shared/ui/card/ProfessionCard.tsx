'use client';

import { type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Button } from '../button';
import { Badge } from '../badge';

export interface ProfessionCardProps {
  title: string;
  description: string;
  category?: string;
  stats?: string; // e.g. "30 навыков · 168 ч · Junior"
  icon?: ReactNode;
  selected?: boolean;
  onSelect?: () => void;
  onView?: () => void;
  className?: string;
}

export function ProfessionCard({
  title,
  description,
  category = 'Разработка',
  stats,
  icon,
  selected = false,
  onSelect,
  onView,
  className,
}: ProfessionCardProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col p-5 rounded-lg bg-surface border transition-all duration-200',
        'w-full max-w-[428px] min-h-[300px]',
        selected
          ? 'border-accent border-2 shadow-soft'
          : 'border-border hover:border-[#D0D5E0]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-md',
              selected ? 'bg-accent-soft text-accent' : 'bg-page text-secondary'
            )}
          >
            {icon || (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            )}
          </div>
          <span className="text-helper text-secondary font-medium">{category}</span>
        </div>
        {selected && (
          <Badge variant="success" withDot>
            Ваша цель
          </Badge>
        )}
      </div>

      {/* Content */}
      <h3 className="text-section text-text mb-2">{title}</h3>
      <p className="text-body text-secondary mb-3 flex-1">{description}</p>
      {stats && <p className="text-helper text-secondary mb-5">{stats}</p>}

      {/* Actions */}
      <div className="flex items-center gap-3 mt-auto">
        <Button
          variant="secondary"
          size="sm"
          onClick={onView}
          className="flex-1"
        >
          Посмотреть карту →
        </Button>
        <Button
          variant={selected ? 'primary' : 'secondary'}
          size="sm"
          onClick={onSelect}
          className="flex-1"
        >
          {selected ? '✓ Выбрано' : 'Выбрать цель'}
        </Button>
      </div>
    </div>
  );
}
