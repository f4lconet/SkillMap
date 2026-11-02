import { Button } from '@/shared/ui';

export function ImportBanner() {
  return (
    <section className="px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 rounded-2xl border border-accent/20 bg-accent-soft/50 px-6 py-5 sm:flex-row sm:items-center sm:px-8">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-xl">🔗</span>
          <div>
            <p className="text-section text-text">
              Ваш опыт уже имеет значение.
            </p>
            <p className="mt-1 text-body text-secondary">
              Подключите GitHub или Stepik. Проверьте найденные навыки и
              добавьте их на карту.
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" className="shrink-0">
          Узнать об импорте
        </Button>
      </div>
    </section>
  );
}
