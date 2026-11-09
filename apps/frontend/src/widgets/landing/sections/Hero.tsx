import Link from 'next/link';
import { Button, Badge, SkillNode } from '@/shared/ui';
import { StartLearningLink } from '@/features/auth';

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:pt-20">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Left: copy */}
        <div className="max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-helper font-medium text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Карьера начинается с понятного маршрута
          </div>

          <h1 className="text-hero leading-[1.1] tracking-tight text-text sm:text-[52px] sm:leading-[1.15]">
            Ваша цель.
            <br />
            Ваши навыки.
            <br />
            <span className="text-accent">Понятный путь.</span>
          </h1>

          <p className="mt-5 text-body text-secondary sm:text-base sm:leading-relaxed">
            Превратите «хочу стать разработчиком» в карту навыков и
            пошаговый план. Узнайте, что уже умеете и что изучать дальше.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <StartLearningLink>
              <Button variant="primary" className="h-11 px-5">
                → Построить мой маршрут
              </Button>
            </StartLearningLink>
            <Link href="/catalog">
              <Button variant="secondary" className="h-11 px-5">
                Посмотреть каталог
              </Button>
            </Link>
          </div>
        </div>

        {/* Right: map preview card */}
        <div className="relative">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
            {/* Card header */}
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-section font-semibold text-text">
                  Frontend-разработчик
                </p>
                <p className="mt-0.5 text-helper text-secondary">
                  Карта Елены · цель Junior
                </p>
              </div>
              <Badge variant="success" className="shrink-0">
                40% до цели пройдено
              </Badge>
            </div>

            <p className="mb-3 text-helper text-secondary">
              Основной трек · 12 из 30 навыков
            </p>

            {/* Mini graph */}
            <div className="relative rounded-xl border border-border/80 bg-page/50 p-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                <SkillNode
                  title="HTML"
                  subtitle="Семантика и формы"
                  status="mastered"
                  className="w-full min-h-[64px]"
                />
                <SkillNode
                  title="CSS"
                  subtitle="Flexbox и Grid"
                  status="mastered"
                  className="w-full min-h-[64px]"
                />
                <SkillNode
                  title="DOM"
                  subtitle="События и элементы"
                  status="mastered"
                  className="w-full min-h-[64px]"
                />
                <SkillNode
                  title="React"
                  subtitle="Компоненты и hooks"
                  status="in-progress"
                  className="w-full min-h-[64px]"
                />
                <SkillNode
                  title="Git"
                  subtitle="Ветки и коммиты"
                  status="mastered"
                  className="w-full min-h-[64px]"
                />
                <SkillNode
                  title="JavaScript"
                  subtitle="Основы языка"
                  status="mastered"
                  className="w-full min-h-[64px]"
                />
                <SkillNode
                  title="Асинхронность"
                  subtitle="Promises, async / await"
                  status="selected"
                  className="w-full min-h-[64px]"
                />
                <SkillNode
                  title="TypeScript"
                  subtitle="Типизация"
                  status="available"
                  className="w-full min-h-[64px]"
                />
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-secondary">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  Освоено
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  В процессе
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-warning" />
                  Можно начать
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-border" />
                  Недоступен
                </span>
              </div>
            </div>

            {/* Next step banner */}
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-accent-soft px-4 py-3">
              <div className="flex items-center gap-2 text-helper text-accent">
                <span className="text-base">✨</span>
                <span>
                  <span className="font-semibold">Следующий шаг:</span>{' '}
                  асинхронность в JavaScript, 8 часов, 3 ресурса
                </span>
              </div>
              <span className="shrink-0 text-accent">↗</span>
            </div>
          </div>

          {/* Decorative blur */}
          <div className="pointer-events-none absolute -right-8 -top-8 -z-10 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
        </div>
      </div>
    </section>
  );
}
