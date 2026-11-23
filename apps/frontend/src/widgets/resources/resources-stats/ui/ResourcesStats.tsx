import { cn } from '@/shared/lib/cn';
import type { AdminResourceStats } from '@/entities/admin-resource';

type Props = {
  stats: AdminResourceStats | null;
  professionTitle: string | null;
  loading: boolean;
};

function StatCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint: string;
  tone?: 'neutral' | 'success' | 'warning';
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="mb-1 text-sm text-secondary">{label}</p>
      <p className="text-3xl font-semibold tracking-tight text-text">{value}</p>
      <p
        className={cn(
          'mt-1 text-sm',
          tone === 'success' && 'text-success',
          tone === 'warning' && 'text-warning',
          tone === 'neutral' && 'text-secondary'
        )}
      >
        {hint}
      </p>
    </div>
  );
}

export function ResourcesStats({ stats, professionTitle, loading }: Props) {
  if (loading && !stats) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div
            key={key}
            className="h-[118px] animate-pulse rounded-xl border border-border bg-surface"
          />
        ))}
      </div>
    );
  }

  const total = stats?.total ?? 0;
  const skillsTotal = stats?.skillsTotal ?? 0;
  const covered = stats?.skillsWithResources ?? 0;
  const needsAttention = (stats?.draft ?? 0) + (stats?.brokenLinks ?? 0);
  const fullyCovered = skillsTotal > 0 && covered >= skillsTotal;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <StatCard
        label="Ресурсов в базе"
        value={String(total)}
        hint={professionTitle ?? 'Все профессии'}
      />
      <StatCard
        label="Связано с навыками"
        value={`${covered} / ${skillsTotal}`}
        hint={
          fullyCovered
            ? 'Для каждого навыка есть материал'
            : 'Есть навыки без материалов'
        }
        tone={fullyCovered ? 'success' : 'warning'}
      />
      <StatCard
        label="Требуют внимания"
        value={String(needsAttention)}
        hint={`${stats?.draft ?? 0} черновиков · ${
          stats?.brokenLinks ?? 0
        } битых ссылок`}
        tone={needsAttention > 0 ? 'warning' : 'success'}
      />
    </div>
  );
}
