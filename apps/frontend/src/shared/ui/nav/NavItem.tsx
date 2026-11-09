'use client';

import { type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface NavItemProps {
  icon?: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  href?: string;
}

export function NavItem({
  icon,
  label,
  active = false,
  onClick,
  className,
  href,
}: NavItemProps) {
  const Comp = href ? 'a' : 'button';

  return (
    <Comp
      href={href}
      onClick={onClick}
      className={cn(
        'inline-flex cursor-pointer items-center gap-2 h-[46px] px-4 rounded-md text-body font-medium transition-colors',
        'outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(83,87,217,0.33)]',
        active
          ? 'bg-accent-soft text-accent hover:bg-[#E3E1FB]'
          : 'text-secondary hover:bg-page hover:text-text',
        className
      )}
    >
      {icon && <span className="w-5 h-5 flex items-center justify-center">{icon}</span>}
      {label}
    </Comp>
  );
}
