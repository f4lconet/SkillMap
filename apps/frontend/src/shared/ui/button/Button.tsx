'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'github' | 'destructive';
export type ButtonSize = 'md' | 'sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  isLoading?: boolean;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: cn(
    'bg-accent text-white',
    'hover:bg-[#4448C4]',
    'focus-visible:ring-[3px] focus-visible:ring-[rgba(83,87,217,0.33)]',
    'disabled:bg-[#A1AABC] disabled:text-white disabled:cursor-not-allowed'
  ),
  secondary: cn(
    'bg-surface text-text border border-border',
    'hover:bg-[#F6F7FB]',
    'focus-visible:ring-[3px] focus-visible:ring-[rgba(83,87,217,0.33)] focus-visible:border-accent',
    'disabled:bg-surface disabled:text-[#A1AABC] disabled:border-border disabled:cursor-not-allowed'
  ),
  github: cn(
    'bg-surface text-text border border-border',
    'hover:bg-[#F6F7FB]',
    'focus-visible:ring-[3px] focus-visible:ring-[rgba(83,87,217,0.33)] focus-visible:border-accent',
    'disabled:bg-surface disabled:text-[#A1AABC] disabled:border-border disabled:cursor-not-allowed'
  ),
  destructive: cn(
    'bg-danger-soft text-danger',
    'hover:bg-[#F8DFE3]',
    'focus-visible:ring-[3px] focus-visible:ring-[rgba(194,74,86,0.33)]',
    'disabled:bg-danger-soft disabled:text-[#A1AABC] disabled:cursor-not-allowed'
  ),
};

const sizeStyles: Record<ButtonSize, string> = {
  md: 'h-11 px-4 text-sm font-semibold rounded-md gap-2', // 44px
  sm: 'h-9 px-3 text-sm font-semibold rounded-md gap-1.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      leftIcon,
      rightIcon,
      isLoading = false,
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex cursor-pointer items-center justify-center transition-colors duration-150',
          'outline-none select-none',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
