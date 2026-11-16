import { Code2 } from "lucide-react";
import type { DashboardKpi, DashboardNextStep } from "@/entities/dashboard";
import { ContinueLink } from "@/features/continue-learning";
import { Progress } from "@/shared/ui";
import { formatHours } from "@/shared/lib/format";

interface Props {
  /** Первый шаг из next_steps; null, если закрытых шагов на неделю не осталось. */
  step: DashboardNextStep | null;
  kpi: DashboardKpi;
}

export function NextStep({ step, kpi }: Props) {
  const progress = Math.round(kpi.progressPercent);
  const caption = `${kpi.masteredCount} из ${kpi.totalSkills} навыков освоено`;

  if (!step) {
    return (
      <section className="rounded-2xl border border-accent/15 bg-accent-soft/70 p-5">
        <p className="text-[15px] font-normal text-secondary">Следующий лучший шаг</p>
        <p className="mt-3 text-lg leading-snug font-semibold">
          Все шаги этой недели закрыты
        </p>
        <p className="mt-0.5 text-sm text-secondary">
          Загляните в траекторию, чтобы увидеть следующие недели.
        </p>
        <Progress value={progress} showValue={false} className="mt-4" />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-secondary">{caption}</p>
          <ContinueLink />
        </div>
      </section>
    );
  }

  const hours = step.skill.estimatedHours;
  const subtitle = [step.skill.category, hours !== null ? formatHours(hours) : null, step.reason]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="rounded-2xl border border-accent/15 bg-accent-soft/70 p-5">
      <p className="text-[15px] font-normal text-secondary">Следующий лучший шаг</p>
      <div className="mt-3 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-accent">
          <Code2 className="size-5" />
        </span>
        <div>
          <p className="text-lg leading-snug font-semibold">{step.skill.title}</p>
          <p className="mt-0.5 text-sm text-secondary">{subtitle}</p>
        </div>
      </div>
      <Progress value={progress} showValue={false} className="mt-4" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-secondary">{caption}</p>
        <ContinueLink />
      </div>
    </section>
  );
}
