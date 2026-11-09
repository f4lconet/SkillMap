'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { useSessionUser } from '../model/useSessionUser';

type Props = {
  className?: string;
  children: ReactNode;
};

/**
 * CTA «начать обучение»: гостя ведём в каталог профессий, авторизованного — на его карту.
 * Регистрация и вход не навязываются — они понадобятся только при выборе профессии.
 */
export function StartLearningLink({ className, children }: Props) {
  const { user } = useSessionUser();
  const href = user ? '/map' : '/catalog';

  return (
    <Link href={href} className={cn('inline-flex', className)}>
      {children}
    </Link>
  );
}
