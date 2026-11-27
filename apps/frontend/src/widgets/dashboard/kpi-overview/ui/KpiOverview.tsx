import { MetricCard } from "@/entities/metric";
import type { DashboardKpi, DashboardWeekActivity } from "@/entities/dashboard";
import { buildKpiMetrics } from "../model/metrics";

interface Props {
  kpi: DashboardKpi;
  weekActivity: DashboardWeekActivity | null;
}

export function KpiOverview({ kpi, weekActivity }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {buildKpiMetrics(kpi, weekActivity).map((metric) => (
        <MetricCard key={metric.id} {...metric} />
      ))}
    </div>
  );
}
