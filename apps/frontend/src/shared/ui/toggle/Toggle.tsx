'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
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
        <span className="relative inline-flex items-center w-[38px] h-[22px]">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            role="switch"
            disabled={disabled}
            className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            {...props}
          />
          {/* Track */}
          <span
            className={cn(
              'block w-full h-full rounded-full bg-border transition-colors duration-200',
              'peer-checked:bg-accent',
              'peer-focus-visible:ring-[3px] peer-focus-visible:ring-[rgba(83,87,217,0.33)]',
              'peer-disabled:bg-border'
            )}
          />
          {/* Thumb */}
          <span
            className={cn(
              'absolute left-[3px] top-[3px] w-4 h-4 rounded-full bg-white shadow-sm',
              'transition-transform duration-200',
              'peer-checked:translate-x-[16px]'
            )}
          />
        </span>
        {label && (
          <span className="text-body text-text">{label}</span>
        )}
      </label>
    );
  }
);

Toggle.displayName = 'Toggle';
