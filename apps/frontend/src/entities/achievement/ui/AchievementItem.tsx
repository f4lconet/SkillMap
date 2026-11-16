import { Check, Flag, Timer } from "lucide-react";
import type { Achievement } from "../model/types";

export function AchievementItem({ icon, date, text }: Achievement) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 text-secondary">
        {icon === "time" && <Timer className="size-5" />}
        {icon === "check" && (
          <span className="flex size-5 items-center justify-center rounded-full bg-success-soft text-success">
            <Check className="size-3.5" />
          </span>
        )}
        {icon === "flag" && <Flag className="size-5 text-accent" />}
      </span>
      <div>
        <p className="text-xs text-secondary">{date}</p>
        <p className="text-[15px]">{text}</p>
      </div>
    </li>
  );
}
