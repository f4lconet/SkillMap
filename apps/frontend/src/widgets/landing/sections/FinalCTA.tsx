import { Button } from '@/shared/ui';
import { StartLearningLink } from '@/features/auth';

export function FinalCTA() {
  return (
    <section className="px-4 pb-20 sm:px-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-accent px-6 py-16 text-center text-white sm:px-12 sm:py-20">
        <h2 className="text-h2 tracking-tight text-white sm:text-[36px]">
          Следующая версия вас
          <br />
          начинается с первого шага.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-body text-white/80">
          Выберите цель. Отметьте навыки. Получите свой маршрут.
        </p>
        <div className="mt-8">
          <StartLearningLink>
            <Button
              variant="secondary"
              className="h-12 border-0 bg-white px-6 text-accent hover:bg-white/90"
            >
              Начать за 3 минуты →
            </Button>
          </StartLearningLink>
        </div>
      </div>
    </section>
  );
}
