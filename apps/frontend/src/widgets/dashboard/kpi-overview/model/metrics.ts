import type { Metric } from "@/entities/metric";
import type { DashboardKpi, DashboardWeekActivity } from "@/entities/dashboard";
import { ROUTES } from "@/shared/config";
import { formatHours } from "@/shared/lib/format";

/** Карточки KPI строятся из /me/dashboard: kpi + активность текущей недели. */
export function buildKpiMetrics(
  kpi: DashboardKpi,
  weekActivity: DashboardWeekActivity | null,
): Metric[] {
  const weekPercent =
    weekActivity && weekActivity.hoursGoal > 0
      ? Math.round((weekActivity.hoursDone / weekActivity.hoursGoal) * 100)
      : null;

  return [
    {
      id: "goal-progress",
      title: "Прогресс до цели",
      value: `${Math.round(kpi.progressPercent)}%`,
      hint: `${kpi.masteredCount} из ${kpi.totalSkills} навыков`,
      href: ROUTES.gap,
    },
    {
      id: "skills-learned",
      title: "Освоено навыков",
      value: String(kpi.masteredCount),
      hint:
        kpi.learningCount > 0
          ? `${kpi.learningCount} в процессе`
          : "Пора отметить первый навык",
      tone: kpi.masteredCount > 0 ? "positive" : "default",
      href: ROUTES.map,
    },
    {
      id: "remaining-hours",
      title: "Осталось часов",
      value:
        kpi.estimatedRemainingHours !== null
          ? formatHours(kpi.estimatedRemainingHours)
          : "—",
      hint:
        kpi.hoursPerWeek !== null
          ? `При ${formatHours(kpi.hoursPerWeek)} в неделю`
          : "До полного освоения цели",
      href: ROUTES.trajectory,
    },
    {
      id: "this-week",
      title: "На этой неделе",
      value: weekActivity
        ? `${formatHours(weekActivity.hoursDone)} / ${weekActivity.hoursGoal} ч`
        : "—",
      hint: weekPercent !== null ? `${weekPercent}% недельного плана` : "План недели не задан",
      href: ROUTES.trajectory,
    },
  ];
}
