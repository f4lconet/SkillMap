import { cn } from '@/shared/lib/cn';
import {
  STEP_ORDER,
  STEP_LABELS,
  type OnboardingStepId,
} from '../model/types';

type StepMeta = {
  id: OnboardingStepId;
  subtitle: string;
};

type Props = {
  current: OnboardingStepId;
  meta: Record<OnboardingStepId, string>;
};

export function OnboardingStepper({ current, meta }: Props) {
  const currentIndex = STEP_ORDER.indexOf(current);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 sm:gap-0 sm:px-6">
      {STEP_ORDER.map((id, index) => {
        const done = index < currentIndex;
        const active = id === current;
        return (
          <div key={id} className="flex min-w-0 flex-1 items-center gap-3 py-1">
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                done && 'bg-success-soft text-success',
                active && 'bg-accent text-white',
                !done && !active && 'bg-page text-secondary'
              )}
            >
              {done ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M3 7.5L5.5 10L11 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <div className="min-w-0">
              <p
                className={cn(
                  'text-helper font-semibold',
                  active ? 'text-text' : 'text-secondary'
                )}
              >
                {STEP_LABELS[id]}
              </p>
              <p className="truncate text-[11px] text-secondary">
                {active ? 'Текущий шаг' : meta[id]}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
