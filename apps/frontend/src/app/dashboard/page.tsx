import { DashboardPage } from "@/widgets/dashboard";

export const metadata = {
  title: "Дашборд — SkillMap",
  description:
    "Прогресс до цели, следующий шаг, учебный ритм недели и последние достижения.",
};

export default function DashboardRoute() {
  return <DashboardPage />;
}
