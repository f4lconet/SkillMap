import { type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export type BadgeVariant =
  | 'success'      // Освоено
  | 'in-progress'  // В процессе
  | 'available'    // Можно начать
  | 'locked'       // Недоступно
  | 'error'        // Ошибка
  | 'neutral';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  /** Show leading icon/dot */
  withDot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-success-soft text-success',
  'in-progress': 'bg-accent-soft text-accent',
  available: 'bg-[#FFF8E8] text-warning', // soft warning
  locked: 'bg-page text-secondary',
  error: 'bg-danger-soft text-danger',
  neutral: 'bg-page text-secondary',
};

export function Badge({
  variant = 'neutral',
  children,
  className,
  withDot = false,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-helper font-medium',
        'h-[22px]', // approx from kit 12/600 padding
        variantStyles[variant],
        className
      )}
    >
      {withDot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            variant === 'success' && 'bg-success',
            variant === 'in-progress' && 'bg-accent',
            variant === 'available' && 'bg-warning',
            variant === 'error' && 'bg-danger',
            (variant === 'locked' || variant === 'neutral') && 'bg-secondary'
          )}
        />
      )}
      {children}
    </span>
  );
}
