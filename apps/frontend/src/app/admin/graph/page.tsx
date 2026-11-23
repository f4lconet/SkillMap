import { GraphEditorPage } from '@/widgets/admin-graph';

export const metadata = {
  title: 'Редактор графа — SkillMap',
  description: 'Управление навыками, зависимостями и структурой профессиональных карт.',
};

export default function AdminGraphRoute() {
  return <GraphEditorPage />;
}
