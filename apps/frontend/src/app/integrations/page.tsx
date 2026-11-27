import { IntegrationsPage } from '@/widgets/integrations';

export const metadata = {
  title: 'Интеграции — SkillMap',
  description:
    'Подключите GitHub и Stepik, проверьте найденные навыки и дополните карту вручную.',
};

export default function IntegrationsRoute() {
  return <IntegrationsPage />;
}
