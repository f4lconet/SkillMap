import { AdminHistoryPage } from '@/widgets/admin-history';

export const metadata = {
  title: 'История изменений — SkillMap',
  description:
    'Кто, когда и что изменил в карте профессии и учебных материалах.',
};

export default function AdminHistoryRoute() {
  return <AdminHistoryPage />;
}
