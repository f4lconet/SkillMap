'use client';

type Props = {
  professionTitle: string;
};

/** Цель уже выбрана в каталоге — здесь только подтверждение. */
export function GoalStep({ professionTitle }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <h2 className="text-section text-text">Ваша цель</h2>
      <p className="mt-1 text-body text-secondary">
        Профессия выбрана в каталоге. На следующих шагах уточним уровень, темп и
        текущие навыки.
      </p>
      <div className="mt-6 rounded-xl border border-accent/30 bg-accent-soft/40 px-5 py-4">
        <p className="text-helper text-secondary">Карьерная цель</p>
        <p className="mt-1 text-h3 text-text">{professionTitle}</p>
      </div>
    </div>
  );
}
