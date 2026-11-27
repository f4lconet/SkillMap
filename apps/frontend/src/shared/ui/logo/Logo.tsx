import Image from 'next/image';
import { cn } from '@/shared/lib/cn';

export interface LogoProps {
  /** Размер знака в пикселях (квадрат). */
  size?: number;
  className?: string;
}

/** Знак SkillMap. Декоративный: рядом всегда стоит текстовая расшифровка бренда. */
export function Logo({ size = 32, className }: LogoProps) {
  return (
    <Image
      src="/logo.svg"
      alt=""
      width={size}
      height={size}
      unoptimized
      className={cn('shrink-0 select-none', className)}
    />
  );
}
