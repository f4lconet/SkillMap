'use client';

import { useState } from 'react';
import { cn } from '@/shared/lib/cn';

const items = [
  {
    q: 'Я только начинаю. Мне подойдёт SkillMap?',
    a: 'Да. Выберите профессию и отметьте знакомые навыки — даже если их пока нет. Карта покажет базу, с которой стоит начать.',
  },
  {
    q: 'SkillMap — это онлайн-курс?',
    a: 'Нет. Это карта навыков и план обучения. Внутри вы найдёте ссылки на учебники, курсы и практические задания.',
  },
  {
    q: 'Можно ли показать карту работодателю?',
    a: 'Да. В профиле можно включить публичную ссылку. Гости увидят ваши навыки и прогресс, но не настройки аккаунта.',
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-h2 tracking-tight text-text">
          До старта осталось совсем немного
        </h2>

        <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-surface">
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={i}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="text-body font-medium text-text">
                    {item.q}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 text-xl text-secondary transition-transform',
                      isOpen && 'rotate-45'
                    )}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-body text-secondary">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
