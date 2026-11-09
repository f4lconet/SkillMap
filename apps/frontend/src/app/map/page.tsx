import { SkillMapPage } from '@/widgets/skill-map/SkillMapPage';

export const metadata = {
  title: 'Карта навыков — SkillMap',
  description: 'Интерактивная карта навыков с зависимостями и прогрессом.',
};

export default function MapRoute() {
  return <SkillMapPage />;
}
