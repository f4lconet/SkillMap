import { ResourcesEditorPage } from '@/widgets/resources';

export const metadata = {
  title: 'Ресурсы — SkillMap',
  description:
    'Управление учебными материалами, их связями с навыками и статусами публикации.',
};

export default function AdminResourcesRoute() {
  return <ResourcesEditorPage />;
}
