export function PlanSection() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Plan week card */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-section text-text">
              Неделя 1 · Асинхронность
            </h3>
            <span className="rounded-full bg-accent-soft px-3 py-1 text-helper font-semibold text-accent">
              10 часов
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-border bg-page/50 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-secondary">
                  📖
                </span>
                <div>
                  <p className="text-body font-medium text-text">
                    Promises и async / await
                  </p>
                  <p className="text-helper text-secondary">
                    Учебник JavaScript · 2 ч
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="cursor-pointer text-helper font-medium text-accent hover:underline"
              >
                Открыть ↗
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-page/50 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-secondary">
                  {'</>'}
                </span>
                <div>
                  <p className="text-body font-medium text-text">
                    Соберите поиск репозиториев
                  </p>
                  <p className="text-helper text-secondary">
                    Практика с GitHub API · 4 ч
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="cursor-pointer text-helper font-medium text-accent hover:underline"
              >
                Открыть ↗
              </button>
            </div>
          </div>

          <p className="mt-4 text-helper text-secondary">
            Ещё 4 часа: обработка ошибок и закрепление.
          </p>
        </div>

        {/* Copy */}
        <div>
          <p className="mb-2 text-helper font-semibold uppercase tracking-wider text-accent">
            Маленькие шаги, реальный результат
          </p>
          <h2 className="text-h2 tracking-tight text-text">
            Откройте план.
            <br />
            И просто начните.
          </h2>
          <p className="mt-4 text-body leading-relaxed text-secondary">
            Не «изучить JavaScript когда-нибудь», а конкретная задача на сегодня.
            Ресурсы, практика и время уже собраны в одном месте.
          </p>
          <div className="mt-6 flex items-center gap-2 text-body text-secondary">
            <span className="text-accent">⏱</span>
            <span>
              10 часов в неделю → около 12 недель до цели
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
