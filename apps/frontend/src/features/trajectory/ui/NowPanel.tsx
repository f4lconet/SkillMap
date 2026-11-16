'use client';

import Link from 'next/link';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import type { TrajectoryWeekItem } from '@/entities/skill';
import { SkillCheck } from './SkillCheck';

type Props = {
  weekNumber: number;
  weekHours: number;
  items: TrajectoryWeekItem[];
  remainingWeekHours: number;
  onToggleItem: (itemId: string) => void;
  savingItemId: string | null;
};

export function NowPanel({
  weekNumber,
  weekHours,
  items,
  remainingWeekHours,
  onToggleItem,
  savingItemId,
}: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-5 text-body text-secondary">
        На эту неделю активных навыков нет — всё освоено или план ещё не
        построен.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-accent/15 bg-accent-soft/50 p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
          Неделя {weekNumber} · {weekHours} ч по плану
        </p>
        <h3 className="mt-2 text-section leading-snug text-text">
          Навыки этой недели
        </h3>

        <ul className="mt-4 space-y-3">
          {items.map((item) => {
            const mastered = item.status === 'done';
            return (
              <li key={item.itemId ?? item.skill.id} className="flex items-start gap-2.5">
                <SkillCheck
                  checked={mastered}
                  disabled={savingItemId === item.itemId}
                  label={item.skill.title}
                  onToggle={() => onToggleItem(item.itemId ?? '')}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-body',
                      mastered ? 'text-secondary line-through' : 'text-text'
                    )}
                  >
                    {item.skill.title}
                  </p>
                  <p className="mt-0.5 text-helper text-secondary">
                    {item.skill.category}
                    {item.continued && ' · продолжение'} · {item.hours} ч
                  </p>
                  {item.resources.length > 0 && (
                    <ul className="mt-1.5 space-y-1">
                      {item.resources.slice(0, 2).map((resource) => (
                        <li key={resource.id}>
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-helper font-medium text-accent underline-offset-2 hover:underline"
                          >
                            {resource.title} ↗
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <Link href="/map">
          <Button variant="primary" className="mt-5 w-full">
            → Открыть карту навыков
          </Button>
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <p className="text-body font-semibold text-text">План не высечен в камне</p>
        <p className="mt-1.5 text-helper leading-relaxed text-secondary">
          Отметьте кружком слева то, что уже сделали, — прогресс недели
          сохранится, а навык попадёт в освоенные. Чтобы пересчитать недели,
          измените нагрузку.
        </p>
        <Link
          href="/profile"
          className="mt-3 inline-block cursor-pointer text-helper font-medium text-accent underline-offset-2 hover:underline"
        >
          Настроить нагрузку →
        </Link>
        {remainingWeekHours > 0 && (
          <p className="mt-3 text-helper text-secondary">
            Ещё {remainingWeekHours} ч по плану на этой неделе
          </p>
        )}
      </div>
    </div>
  );
}
