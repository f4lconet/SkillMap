import type { DashboardAchievement } from "@/entities/dashboard";
import { AchievementItem } from "@/entities/achievement";

interface Props {
  items: DashboardAchievement[];
}

export function RecentAchievements({ items }: Props) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5">
      <h2 className="text-lg font-semibold">Последние достижения</h2>
      {items.length > 0 ? (
        <ul className="mt-4 space-y-4">
          {items.map((item) => (
            <AchievementItem
              key={`${item.date}-${item.text}`}
              icon={item.kind}
              date={item.date}
              text={item.text}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-secondary">
          Отметьте первый навык на карте — события появятся здесь.
        </p>
      )}
    </section>
  );
}
