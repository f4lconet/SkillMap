'use client';

import { useMemo, useState } from 'react';
import type { OnboardingSkill } from '../model/types';
import { SkillToggle } from './SkillToggle';
import { cn } from '@/shared/lib/cn';

type Props = {
  skills: OnboardingSkill[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

export function SkillsStep({ skills, selectedIds, onChange }: Props) {
  const [showAll, setShowAll] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const basic = skills.filter((s) => s.group === 'basic');
  const next = skills.filter((s) => s.group === 'next');
  const advanced = skills.filter((s) => s.group === 'advanced');
  const hiddenCount = advanced.length;

  const toggle = (id: string, checked: boolean) => {
    if (checked) onChange([...selectedIds, id]);
    else onChange(selectedIds.filter((x) => x !== id));
  };

  const marked = selectedIds.length;
  const unmarked = skills.length - marked;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <h2 className="text-section text-text">Что вы можете применить на практике?</h2>
      <p className="mt-1 text-body text-secondary">
        Отмечайте навык, если можете решить базовую задачу без пошаговой инструкции.
      </p>

      {/* Counters */}
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-accent-soft px-3 py-1 text-helper font-medium text-accent">
          Все навыки · {skills.length}
        </span>
        <span className="rounded-full bg-success-soft px-3 py-1 text-helper font-medium text-success">
          Отмечено · {marked}
        </span>
        <span className="rounded-full bg-page px-3 py-1 text-helper font-medium text-secondary">
          Не отмечено · {unmarked}
        </span>
      </div>

      {/* Basic */}
      {basic.length > 0 && (
        <>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-wider text-secondary">
            Базовые навыки
          </p>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {basic.map((s) => (
              <SkillToggle
                key={s.id}
                title={s.title}
                checked={selectedSet.has(s.id)}
                onChange={(v) => toggle(s.id, v)}
              />
            ))}
          </div>
        </>
      )}

      {/* Next level */}
      {next.length > 0 && (
        <>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-wider text-secondary">
            Следующий уровень
          </p>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
            {next.map((s) => (
              <SkillToggle
                key={s.id}
                title={s.title}
                checked={selectedSet.has(s.id)}
                onChange={(v) => toggle(s.id, v)}
              />
            ))}
          </div>
        </>
      )}

      {/* Advanced (collapsible) */}
      {showAll && advanced.length > 0 && (
        <>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-wider text-secondary">
            Ещё навыки
          </p>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {advanced.map((s) => (
              <SkillToggle
                key={s.id}
                title={s.title}
                checked={selectedSet.has(s.id)}
                onChange={(v) => toggle(s.id, v)}
              />
            ))}
          </div>
        </>
      )}

      {skills.length === 0 && (
        <p className="mt-6 rounded-xl border border-border bg-page px-4 py-3 text-body text-secondary">
          Для этой профессии список навыков пока пуст.
        </p>
      )}

      {!showAll && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className={cn(
            'mt-5 cursor-pointer text-helper font-medium text-accent hover:underline'
          )}
        >
          Показать ещё {hiddenCount} навыков ↓
        </button>
      )}
      {showAll && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="mt-5 cursor-pointer text-helper font-medium text-accent hover:underline"
        >
          Свернуть ↑
        </button>
      )}
    </div>
  );
}
