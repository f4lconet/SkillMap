import { Progress } from "@/shared/ui";
import type { Goal } from "../model/types";

export function GoalProgressCard({ goal }: { goal: Goal }) {
  return (
    <div className="mx-3 mb-3 rounded-xl bg-accent-soft p-3">
      <p className="text-[10px] font-semibold tracking-[0.08em] text-secondary uppercase">
        Ваша цель
      </p>
      <p className="mt-1 text-sm font-semibold text-text">{goal.title}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-secondary">
        <span>{goal.level}</span>
        <span className="font-semibold text-text">{goal.progress}%</span>
      </div>
      <Progress value={goal.progress} showValue={false} className="mt-1.5" />
    </div>
  );
}
