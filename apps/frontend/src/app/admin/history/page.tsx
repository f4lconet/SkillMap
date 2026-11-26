import { AdminHistoryPage } from '@/widgets/admin-history';

export const metadata = {
  title: 'История изменений — SkillMap',
  description:
    'Журнал правок контента: кто, что и когда менял в профессиях, навыках и ресурсах.',
};

export default function AdminHistoryRoute() {
  return <AdminHistoryPage />;
}
