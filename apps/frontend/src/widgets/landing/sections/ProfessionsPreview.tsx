import Link from 'next/link';
import { Button } from '@/shared/ui';

const professions = [
  {
    title: 'Frontend-разработчик',
    meta: '30 навыков · Junior',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    title: 'Аналитик данных',
    meta: '32 навыка · Junior',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'UX/UI-дизайнер',
    meta: '28 навыков · Junior',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
      </svg>
    ),
  },
];

export function ProfessionsPreview() {
  return (
    <section id="catalog" className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-helper font-semibold uppercase tracking-wider text-accent">
              Найдите своё направление
            </p>
            <h2 className="text-h2 tracking-tight text-text">
              Кем вы хотите стать?
            </h2>
          </div>
          <Link href="/catalog">
            <Button variant="secondary" size="sm">
              → Все 12 профессий
            </Button>
          </Link>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {professions.map((p) => (
            <Link
              key={p.title}
              href="/catalog"
              className="group rounded-2xl border border-border bg-surface p-6 transition-all hover:border-accent/40 hover:shadow-soft"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                {p.icon}
              </div>
              <h3 className="text-section text-text">{p.title}</h3>
              <p className="mt-1 text-helper text-secondary">{p.meta}</p>
              <p className="mt-4 text-helper font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                Посмотреть карту →
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
