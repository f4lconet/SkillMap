"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
} from "recharts";
import type { DashboardWeekActivity } from "@/entities/dashboard";
import { CHART_COLORS } from "@/shared/config";
import { formatHours } from "@/shared/lib/format";

interface Props {
  activity: DashboardWeekActivity | null;
}

function cellFill(entry: { current: boolean; filled: boolean }): string {
  if (entry.current) return CHART_COLORS.accent;
  if (entry.filled) return CHART_COLORS.accentSoftBar;
  return CHART_COLORS.mutedBar;
}

export function LearningRhythm({ activity }: Props) {
  if (!activity) {
    return (
      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="text-lg font-semibold">Ваш учебный ритм</h2>
        <p className="mt-3 text-sm text-secondary">
          Недельный план появится, когда будет выбрана цель и построена траектория.
        </p>
      </section>
    );
  }

  const remaining = Math.max(0, activity.hoursGoal - activity.hoursDone);
  const chartData = activity.days.map((day) => ({
    day: day.day,
    // Минимальная высота, чтобы столбец нулевого дня оставался видимым.
    hours: Math.max(day.hours, 0.1),
    label: day.hours > 0 ? formatHours(day.hours) : "",
    current: day.current,
    filled: day.hours > 0,
  }));

  return (
    <section className="rounded-2xl border border-border bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ваш учебный ритм</h2>
        <span className="text-sm font-medium text-accent">
          {formatHours(activity.hoursDone)}
        </span>
      </div>
      <p className="mt-0.5 text-sm text-secondary">{activity.label}</p>
      <div className="mt-2 h-[210px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 18, right: 0, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="day"
              tick={{ fill: CHART_COLORS.axisText, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Bar dataKey="hours" radius={[6, 6, 2, 2]} maxBarSize={34} minPointSize={6}>
              <LabelList
                dataKey="label"
                position="top"
                style={{ fill: CHART_COLORS.axisText, fontSize: 11 }}
              />
              {chartData.map((entry) => (
                <Cell key={entry.day} fill={cellFill(entry)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-sm text-secondary">
        {remaining > 0
          ? `Ещё ${formatHours(remaining)} до недельной цели`
          : "Недельная цель достигнута — отличный темп"}
      </p>
    </section>
  );
}
