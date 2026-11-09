'use client';

import { type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export type SkillNodeStatus =
  | 'mastered'    // Освоено
  | 'in-progress' // В процессе
  | 'available'   // Можно начать
  | 'locked'      // Недоступно
  | 'selected';    // Выбрана

export interface SkillNodeProps {
  title: string;
  subtitle?: string;
  status: SkillNodeStatus;
  icon?: ReactNode;
  onClick?: () => void;
  className?: string;
}

const statusStyles: Record<SkillNodeStatus, string> = {
  mastered: 'bg-success-soft border-success text-success hover:bg-[#DDF1E6]',
  'in-progress': 'bg-accent-soft border-accent text-accent border-dashed hover:bg-[#E3E1FB]',
  available: 'bg-surface border-border text-text hover:border-accent/50 hover:bg-page/60',
  locked: 'bg-page border-border text-secondary opacity-70',
  selected: 'bg-accent border-accent text-white shadow-soft hover:bg-[#494DC8]',
};

const statusIcon: Record<SkillNodeStatus, ReactNode> = {
  mastered: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  'in-progress': null,
  available: null,
  locked: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  selected: null,
};

export function SkillNode({
  title,
  subtitle,
  status,
  icon,
  onClick,
  className,
}: SkillNodeProps) {
  const isClickable = status !== 'locked' && !!onClick;

  return (
    <button
      type="button"
      disabled={!isClickable}
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-1 p-3 rounded-md border text-left',
        'w-[158px] min-h-[79px] transition-all duration-150',
        'outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(83,87,217,0.33)]',
        statusStyles[status],
        isClickable && 'cursor-pointer',
        !isClickable && 'cursor-default',
        className
      )}
    >
      <div className="flex items-center gap-1.5 w-full">
        {(icon || statusIcon[status]) && (
          <span className="flex-shrink-0 opacity-90">
            {icon || statusIcon[status]}
          </span>
        )}
        <span className="text-label font-semibold truncate">{title}</span>
      </div>
      {subtitle && (
        <span
          className={cn(
            'text-helper leading-tight',
            status === 'selected' ? 'text-white/80' : 'text-secondary'
          )}
        >
          {subtitle}
        </span>
      )}
    </button>
  );
}
