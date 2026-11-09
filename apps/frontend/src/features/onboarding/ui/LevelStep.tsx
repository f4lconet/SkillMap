'use client';

import { cn } from '@/shared/lib/cn';
import type { UserLevel } from '../model/types';

const OPTIONS: { value: UserLevel; title: string; description: string }[] = [
  {
    value: 'beginner',
    title: 'Junior',
    description: 'Осваиваю основы, нужна структура и понятный порядок тем.',
  },
  {
    value: 'intermediate',
    title: 'Middle',
    description: 'Уже писал код или проекты, хочу закрыть пробелы системно.',
  },
  {
    value: 'advanced',
    title: 'Senior',
    description: 'Сильный опыт, карта нужна для углубления и смежных тем.',
  },
];

type Props = {
  value: UserLevel;
  onChange: (v: UserLevel) => void;
};

export function LevelStep({ value, onChange }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <h2 className="text-section text-text">Какой у вас целевой уровень?</h2>
      <p className="mt-1 text-body text-secondary">
        От уровня зависит глубина карты и оценка сроков.
      </p>
      <div className="mt-6 space-y-3">
        {OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'flex w-full flex-col rounded-xl border px-5 py-4 text-left transition-colors',
                active
                  ? 'border-accent bg-accent-soft/50'
                  : 'border-border hover:border-[#D0D5E0]'
              )}
            >
              <span className="text-section text-text">{opt.title}</span>
              <span className="mt-1 text-body text-secondary">{opt.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
