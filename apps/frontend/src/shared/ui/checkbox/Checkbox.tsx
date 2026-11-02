'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, id, disabled, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <label
        htmlFor={inputId}
        className={cn(
          'inline-flex items-center gap-2 cursor-pointer select-none',
          disabled && 'cursor-not-allowed opacity-60',
          className
        )}
      >
        <span className="relative flex items-center justify-center w-[18px] h-[18px]">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            disabled={disabled}
            className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            {...props}
          />
          <span
            className={cn(
              'block w-[18px] h-[18px] rounded-[4px] border border-border bg-surface',
              'peer-checked:bg-accent peer-checked:border-accent',
              'peer-focus-visible:ring-[3px] peer-focus-visible:ring-[rgba(83,87,217,0.33)]',
              'peer-disabled:bg-page peer-disabled:border-border',
              'transition-colors duration-150'
            )}
          />
          {/* Checkmark */}
          <svg
            className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="2 6 5 9 10 3" />
          </svg>
        </span>
        {label && (
          <span className="text-body text-text">{label}</span>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
