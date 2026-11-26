import { AdminOverviewPage } from '@/widgets/admin-overview';

export const metadata = {
  title: 'Обзор редакторской — SkillMap',
  description:
    'Состояние карты, качество материалов и всё, что важно перед публикацией.',
};

export default function AdminOverviewRoute() {
  return <AdminOverviewPage />;
}
