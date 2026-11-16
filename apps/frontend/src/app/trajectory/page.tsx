import { TrajectoryPage } from '@/widgets/trajectory/TrajectoryPage';

export const metadata = {
  title: 'Траектория обучения — SkillMap',
  description: 'Понедельный план обучения с учётом зависимостей и вашего темпа.',
};

export default function TrajectoryRoute() {
  return <TrajectoryPage />;
}