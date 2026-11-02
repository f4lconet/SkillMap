'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export type InputState = 'default' | 'focus' | 'error' | 'disabled';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  errorText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  state?: InputState;
  /** Force error state (shows errorText and red border) */
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      errorText,
      leftIcon,
      rightIcon,
      state,
      error = false,
      className,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || props.name;
    const isError = error || state === 'error';
    const isDisabled = disabled || state === 'disabled';

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-label text-text font-semibold"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={isDisabled}
            className={cn(
              'w-full h-12 px-4 rounded-md border bg-surface text-body text-text',
              'placeholder:text-secondary',
              'transition-colors duration-150 outline-none',
              'disabled:bg-page disabled:text-secondary disabled:cursor-not-allowed',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              isError
                ? 'border-danger focus:border-danger focus:ring-[3px] focus:ring-[rgba(194,74,86,0.2)]'
                : 'border-border focus:border-accent focus:ring-[3px] focus:ring-[rgba(83,87,217,0.33)]',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary">
              {rightIcon}
            </span>
          )}
        </div>

        {(helperText || errorText) && (
          <p
            className={cn(
              'text-helper',
              isError ? 'text-danger' : 'text-secondary'
            )}
          >
            {isError ? errorText : helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
