'use client';

import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  errorText?: string;
  error?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      helperText,
      errorText,
      error = false,
      options,
      placeholder,
      className,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || props.name;
    const isError = error;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={selectId} className="text-label text-text font-semibold">
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={cn(
              'w-full h-12 px-4 pr-10 rounded-md border bg-surface text-body text-text appearance-none',
              'transition-colors duration-150 outline-none cursor-pointer',
              'disabled:bg-page disabled:text-secondary disabled:cursor-not-allowed',
              isError
                ? 'border-danger focus:border-danger focus:ring-[3px] focus:ring-[rgba(194,74,86,0.2)]'
                : 'border-border focus:border-accent focus:ring-[3px] focus:ring-[rgba(83,87,217,0.33)]',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Chevron */}
          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>

        {(helperText || errorText) && (
          <p className={cn('text-helper', isError ? 'text-danger' : 'text-secondary')}>
            {isError ? errorText : helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
