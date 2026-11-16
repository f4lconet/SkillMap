import { CircleHelp } from "lucide-react";

export function HelpFeedbackButton() {
  return (
    <button
      type="button"
      className="mt-2 flex items-center gap-1.5 text-xs text-secondary hover:text-text"
    >
      <CircleHelp className="size-3.5" />
      Помощь и обратная связь
    </button>
  );
}
