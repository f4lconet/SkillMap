import { USER_LEVEL_LABELS, type UserLevel } from "@/entities/user";
import { formatToday } from "@/shared/lib/format";

interface Props {
  userName: string;
  /** Название целевой профессии; null, если цель ещё не выбрана. */
  professionTitle: string | null;
  /** API-значение уровня (beginner/intermediate/advanced). */
  level: string | null;
}

export function DashboardGreeting({ userName, professionTitle, level }: Props) {
  const firstName = userName.split(" ")[0] || "Привет";
  const levelLabel = level ? (USER_LEVEL_LABELS[level as UserLevel] ?? level) : null;

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.08em] text-accent uppercase">
          {formatToday()}
        </p>
        <h1 className="mt-1 text-[32px] leading-tight font-bold tracking-tight">
          {firstName}, вы движетесь вперёд <span aria-hidden>👋</span>
        </h1>
        <p className="mt-1 text-[15px] text-secondary">
          {professionTitle
            ? `Вот как продвигается ваш путь к профессии ${professionTitle}.`
            : "Выберите профессию, чтобы увидеть карту навыков и личный план."}
        </p>
      </div>
      {professionTitle && levelLabel && (
        <span className="rounded-full bg-accent-soft px-3 py-1.5 text-[13px] font-medium text-accent">
          Цель · {levelLabel}
        </span>
      )}
    </div>
  );
}
