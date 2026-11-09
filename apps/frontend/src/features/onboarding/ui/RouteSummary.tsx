import { Progress } from '@/shared/ui';
import { USER_LEVEL_LABELS, type UserLevel } from '../model/types';

type Props = {
  professionTitle: string;
  level: UserLevel;
  hoursPerWeek: number;
  selectedCount: number;
  totalSkills: number;
  remainingHours: number;
};

export function RouteSummary({
  professionTitle,
  level,
  hoursPerWeek,
  selectedCount,
  totalSkills,
  remainingHours,
}: Props) {
  const percent =
    totalSkills > 0 ? Math.round((selectedCount / totalSkills) * 100) : 0;
  const remainingWeeks =
    hoursPerWeek > 0 ? Math.max(1, Math.ceil(remainingHours / hoursPerWeek)) : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-accent/15 bg-accent-soft/60 p-5">
        <p className="text-helper font-semibold text-secondary">Ваш маршрут</p>
        <h3 className="mt-1 text-section text-text">{professionTitle}</h3>
        <span className="mt-3 inline-flex rounded-full bg-surface px-2.5 py-1 text-helper text-secondary">
          Целевой уровень · {USER_LEVEL_LABELS[level]}
        </span>

        <p className="mt-4 text-body text-text">{hoursPerWeek} часов в неделю</p>
        <p className="text-helper text-secondary">Можно изменить после настройки</p>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-helper">
            <span className="text-secondary">
              {selectedCount} из {totalSkills} освоено
            </span>
            <span className="font-semibold text-text">{percent}%</span>
          </div>
          <Progress value={percent} showValue={false} />
        </div>

        <p className="mt-3 text-helper text-secondary">
          Осталось около {remainingHours} часов — примерно {remainingWeeks} недель
          в вашем темпе.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex gap-3">
          <span className="text-lg">💡</span>
          <p className="text-body text-secondary">
            Не уверены в навыке? Пока не отмечайте его. На карте будут описание,
            ресурсы и практическая задача для проверки.
          </p>
        </div>
      </div>
    </div>
  );
}
