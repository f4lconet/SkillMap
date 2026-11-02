import { cn } from '@/shared/lib/cn';

export type OnboardingStepStatus = 'complete' | 'current' | 'upcoming';

export interface OnboardingStepProps {
  number: number | string;
  title: string;
  subtitle?: string;
  status: OnboardingStepStatus;
  className?: string;
}

export function OnboardingStep({
  number,
  title,
  subtitle,
  status,
  className,
}: OnboardingStepProps) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      {/* Indicator */}
      <div
        className={cn(
          'flex items-center justify-center w-[34px] h-[34px] rounded-full flex-shrink-0 text-sm font-semibold',
          status === 'complete' && 'bg-success text-white',
          status === 'current' && 'bg-accent text-white',
          status === 'upcoming' && 'bg-page text-secondary border border-border'
        )}
      >
        {status === 'complete' ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          number
        )}
      </div>

      {/* Text */}
      <div className="pt-0.5">
        <p
          className={cn(
            'text-body font-semibold',
            status === 'upcoming' ? 'text-secondary' : 'text-text'
          )}
        >
          {title}
        </p>
        {subtitle && (
          <p className="text-helper text-secondary mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
