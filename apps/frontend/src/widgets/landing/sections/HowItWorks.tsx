const steps = [
  {
    num: '01',
    title: 'Выберите профессию',
    description:
      'Frontend, аналитика, дизайн — найдите направление и целевой уровень.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4l2.5 2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Отметьте, что умеете',
    description:
      'Навыки из опыта, проектов и курсов складываются в вашу точку старта.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Получите план по неделям',
    description:
      'Изучайте зависимости в верном порядке и в удобном для вас темпе.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="mb-2 text-helper font-semibold uppercase tracking-wider text-accent">
          От цели к действию
        </p>
        <h2 className="text-h2 tracking-tight text-text">
          Не ещё один список курсов. Ваш маршрут.
        </h2>
        <p className="mt-3 max-w-xl text-body text-secondary">
          Три шага, чтобы понять, где вы сейчас и куда двигаться.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.num}
              className="rounded-2xl border border-border bg-surface p-6 transition-shadow hover:shadow-soft"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-helper font-semibold text-secondary">
                  {step.num} /
                </span>
                <span className="text-accent">{step.icon}</span>
              </div>
              <h3 className="text-section text-text">{step.title}</h3>
              <p className="mt-2 text-body text-secondary">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
