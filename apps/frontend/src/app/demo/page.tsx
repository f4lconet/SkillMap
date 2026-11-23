import { DemoMapPage } from '@/widgets/demo-map';

export const metadata = {
  title: 'Демо-карта навыков — SkillMap',
  description:
    'Посмотрите карту навыков профессии без регистрации: зависимости, порядок изучения и связи между навыками.',
};

export default function DemoRoute() {
  return <DemoMapPage />;
}
