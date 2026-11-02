import { cn } from '@/shared/lib/cn';

export interface ProgressProps {
  value: number; // 0–100
  max?: number;
  label?: string;
  showValue?: boolean;
  className?: string;
  /** Height of the track */
  size?: 'sm' | 'md';
}

export function Progress({
  value,
  max = 100,
  label,
  showValue = true,
  className,
  size = 'md',
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-helper text-secondary">{label}</span>}
          {showValue && (
            <span className="text-helper font-semibold text-text">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          'w-full rounded-full bg-border overflow-hidden',
          size === 'sm' ? 'h-1.5' : 'h-[7px]'
        )}
      >
        <div
          className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
