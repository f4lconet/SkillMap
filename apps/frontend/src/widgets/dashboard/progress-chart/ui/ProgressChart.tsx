"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardProgressPoint } from "@/entities/dashboard";
import { CHART_COLORS } from "@/shared/config";
import { formatPercent, pluralSkills } from "@/shared/lib/format";

const { accent, grid, axisText, white } = CHART_COLORS;

interface Props {
  history: DashboardProgressPoint[];
}

/** Границы оси Y подбираем под фактические значения, чтобы линия не была плоской. */
function buildDomain(values: number[]): { lower: number; upper: number; ticks: number[] } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const lower = Math.max(0, Math.floor(min / 10) * 10 - 10);
  const upper = Math.min(100, Math.max(Math.ceil((max + 1) / 10) * 10, lower + 10));
  const middle = Math.round((lower + upper) / 2);

  return { lower, upper, ticks: [lower, middle, upper] };
}

export function ProgressChart({ history }: Props) {
  const hasHistory = history.length > 0;
  const domain = hasHistory ? buildDomain(history.map((point) => point.value)) : null;

  const first = history[0];
  const last = history[history.length - 1];
  const gained = first && last ? last.mastered - first.mastered : 0;

  return (
    <section className="rounded-2xl border border-border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Ближе к цели каждую неделю</h2>
          <p className="mt-0.5 text-sm text-secondary">Освоенные навыки, % от цели</p>
        </div>
        <span className="rounded-full bg-page px-2.5 py-1 text-xs text-secondary">
          {history.length} нед.
        </span>
      </div>

      {domain ? (
        <>
          <div className="mt-2 h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="goalFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={grid} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: axisText, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[domain.lower, domain.upper]}
                  ticks={domain.ticks}
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fill: axisText, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={accent}
                  strokeWidth={2.5}
                  fill="url(#goalFill)"
                  dot={{ r: 4, fill: accent, stroke: white, strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className={gained > 0 ? "text-sm font-medium text-success" : "text-sm text-secondary"}>
            {gained > 0
              ? `+${gained} ${pluralSkills(gained)} · с ${formatPercent(first.value)} до ${formatPercent(last.value)}`
              : `Пока без роста · ${formatPercent(last.value)} освоено`}
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-secondary">
          История прогресса появится, когда вы отметите первые навыки.
        </p>
      )}
    </section>
  );
}
