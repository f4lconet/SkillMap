'use client';

import { cn } from '@/shared/lib/cn';

type Props = {
  title: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function SkillToggle({ title, checked, onChange }: Props) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left text-body transition-colors',
        checked
          ? 'border-[#B8E0C8] bg-[#E7F5EE] text-text hover:bg-[#DDF1E6]'
          : 'border-border bg-surface text-text hover:border-[#D0D5E0] hover:bg-page/60'
      )}
    >
      <span
        className={cn(
          'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border transition-colors',
          checked
            ? 'border-success bg-success text-white'
            : 'border-border bg-surface'
        )}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6.5L5 9.5L10 3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="font-medium">{title}</span>
    </button>
  );
}
