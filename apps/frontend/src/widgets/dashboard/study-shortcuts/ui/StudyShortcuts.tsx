import Link from "next/link";
import type { DashboardNextStep } from "@/entities/dashboard";
import { OpenResourceButton } from "@/features/open-resource";
import { ROUTES } from "@/shared/config";
import { formatHours } from "@/shared/lib/format";

interface Props {
  step: DashboardNextStep | null;
  /** Остаток часов до полного освоения профессии (kpi.estimated_remaining_hours). */
  remainingHours: number | null;
}

export function StudyShortcuts({ step, remainingHours }: Props) {
  const resource = step?.resources[0] ?? null;
  const resourceHours = resource?.estimatedHours ?? step?.skill.estimatedHours ?? null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <section className="rounded-2xl border border-border bg-white p-5">
        <p className="text-[15px] font-semibold">После практики</p>
        {resource ? (
          <>
            <p className="mt-2 text-[15px] text-secondary">
              {resource.title}
              {resourceHours !== null ? ` · ${formatHours(resourceHours)}` : ""}
            </p>
            <OpenResourceButton href={resource.url} />
          </>
        ) : (
          <>
            <p className="mt-2 text-[15px] text-secondary">
              Для текущего шага пока нет материалов
            </p>
            <Link
              href={ROUTES.map}
              className="mt-4 inline-block text-sm font-medium text-accent"
            >
              Открыть карту навыков
            </Link>
          </>
        )}
      </section>
      <section className="rounded-2xl border border-border bg-white p-5">
        <p className="text-[15px] font-semibold">Ваш маршрут</p>
        <p className="mt-2 text-[15px] text-secondary">
          {remainingHours !== null
            ? `Осталось ${formatHours(remainingHours)} до цели`
            : "Цель пока не выбрана"}
        </p>
        <Link
          href={ROUTES.trajectory}
          className="mt-4 inline-block text-sm font-medium text-accent"
        >
          Посмотреть траекторию
        </Link>
      </section>
    </div>
  );
}
