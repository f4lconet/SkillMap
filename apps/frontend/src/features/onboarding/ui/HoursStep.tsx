'use client';

import { cn } from '@/shared/lib/cn';

const PRESETS = [5, 10, 15, 20];

type Props = {
  value: number;
  onChange: (v: number) => void;
};

export function HoursStep({ value, onChange }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <h2 className="text-section text-text">Сколько часов в неделю готовы учиться?</h2>
      <p className="mt-1 text-body text-secondary">
        План разложит навыки по неделям под ваш темп. Можно изменить позже.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        {PRESETS.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => onChange(h)}
            className={cn(
              'min-w-[88px] rounded-xl border px-4 py-3 text-section transition-colors',
              value === h
                ? 'border-accent bg-accent text-white'
                : 'border-border bg-surface text-text hover:border-accent/40'
            )}
          >
            {h} ч
          </button>
        ))}
      </div>

      <div className="mt-6 max-w-xs">
        <label className="mb-1.5 block text-label text-text">Своё значение</label>
        <input
          type="number"
          min={1}
          max={40}
          value={value}
          onChange={(e) =>
            onChange(Math.min(40, Math.max(1, Number(e.target.value) || 1)))
          }
          className="h-12 w-full rounded-md border border-border bg-surface px-4 text-body outline-none focus:border-accent focus:ring-[3px] focus:ring-[rgba(83,87,217,0.33)]"
        />
      </div>
    </div>
  );
}
