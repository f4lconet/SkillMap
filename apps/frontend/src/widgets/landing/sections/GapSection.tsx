import { Progress, Badge } from '@/shared/ui';

export function GapSection() {
  return (
    <section className="bg-[#0F1729] px-4 py-16 text-white sm:px-6 sm:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="mb-2 text-helper font-semibold uppercase tracking-wider text-accent">
            Gap Analysis
          </p>
          <h2 className="text-h2 tracking-tight text-white">
            Знайте не только цель, но и расстояние до неё.
          </h2>
          <p className="mt-4 text-body leading-relaxed text-white/70">
            Сравните текущие навыки с требованиями профессии. Сфокусируйтесь на
            пробелах и сохраните отчёт в PDF.
          </p>
        </div>

        {/* Gap card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-section font-semibold text-white">
                Frontend · Junior
              </p>
              <div className="mt-4 flex items-end gap-6">
                <div>
                  <p className="text-3xl font-bold text-white">12 / 30</p>
                  <p className="text-helper text-white/50">навыков освоено</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">120 ч</p>
                  <p className="text-helper text-white/50">оценка до цели</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-accent">40%</p>
            </div>
          </div>

          <div className="mt-5">
            <Progress value={40} showValue={false} className="[&>div]:bg-white/10 [&>div>div]:bg-accent" />
          </div>

          <div className="mt-4">
            <Badge variant="in-progress" className="bg-accent/20 text-accent">
              Приоритет: асинхронность → React
            </Badge>
          </div>
        </div>
      </div>
    </section>
  );
}
