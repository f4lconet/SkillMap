export type AchievementIcon = "time" | "check" | "flag";

export interface Achievement {
  icon: AchievementIcon;
  date: string;
  text: string;
}
