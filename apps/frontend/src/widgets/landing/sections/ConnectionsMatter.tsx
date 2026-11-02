import Link from 'next/link';
import { Button, Badge } from '@/shared/ui';

export function ConnectionsMatter() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Left: mini flow */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success" withDot>
              JavaScript
            </Badge>
            <span className="text-secondary">→</span>
            <Badge variant="in-progress" withDot>
              Асинхронность
            </Badge>
            <span className="text-secondary">→</span>
            <Badge variant="available" withDot>
              React
            </Badge>
          </div>

          <h3 className="mt-5 text-section text-text">
            У каждого шага есть причина
          </h3>
          <p className="mt-2 text-body text-secondary">
            Чтобы уверенно работать с React, сначала разберитесь с языком, DOM и
            асинхронным кодом.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-success-soft px-3 py-1 text-helper font-medium text-success">
              12 освоено
            </span>
            <span className="rounded-full bg-accent-soft px-3 py-1 text-helper font-medium text-accent">
              3 в процессе
            </span>
            <span className="rounded-full bg-page px-3 py-1 text-helper font-medium text-secondary">
              15 впереди
            </span>
          </div>
        </div>

        {/* Right: copy */}
        <div>
          <p className="mb-2 text-helper font-semibold uppercase tracking-wider text-accent">
            Видеть полную картину
          </p>
          <h2 className="text-h2 tracking-tight text-text">
            Связи важнее отдельных галочек.
          </h2>
          <p className="mt-4 text-body text-secondary leading-relaxed">
            Карта объясняет, какие знания открывают следующие. Цвета показывают
            прогресс, а каждый узел — конкретный навык с ресурсами.
          </p>
          <div className="mt-6">
            <Link href="/demo">
              <Button variant="secondary">
                ↗ Исследовать демо-карту
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
