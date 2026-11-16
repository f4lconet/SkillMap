'use client';

import { cn } from '@/shared/lib/cn';

type Props = {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onToggle: () => void;
};

/** Кружок-переключатель статуса навыка внутри недели плана. */
export function SkillCheck({ checked, disabled, label, onToggle }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={
        checked
          ? `Снять отметку «${label}»`
          : `Отметить «${label}» как выполненное`
      }
      title={
        checked
          ? 'Выполнено — нажмите, чтобы снять отметку'
          : 'Отметить как выполненное'
      }
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className={cn(
        '-m-0.5 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full',
        'outline-none transition-colors hover:bg-success-soft',
        'focus-visible:ring-[3px] focus-visible:ring-[rgba(83,87,217,0.33)]',
        'disabled:cursor-wait disabled:opacity-60'
      )}
    >
      <span
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
          checked
            ? 'border-success bg-success text-white'
            : 'border-border bg-surface'
        )}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M2.5 6.5L5 9L9.5 3.5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </button>
  );
}
