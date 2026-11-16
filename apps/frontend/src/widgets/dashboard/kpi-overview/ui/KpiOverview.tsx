import { MetricCard } from "@/entities/metric";
import type { DashboardKpi, DashboardWeekActivity } from "@/entities/dashboard";
import { buildKpiMetrics } from "../model/metrics";

interface Props {
  kpi: DashboardKpi;
  weekActivity: DashboardWeekActivity | null;
}

export function KpiOverview({ kpi, weekActivity }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {buildKpiMetrics(kpi, weekActivity).map((metric) => (
        <MetricCard key={metric.id} {...metric} />
      ))}
    </div>
  );
}
