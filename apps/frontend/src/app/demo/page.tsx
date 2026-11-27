import { DemoMapPage } from '@/widgets/demo-map';

export const metadata = {
  title: 'Демо-карта навыков — SkillMap',
  description:
    'Посмотрите карту навыков профессии без регистрации: зависимости, порядок изучения и связи между навыками.',
};

// Ссылка из каталога передаёт профессию в ?profession=, поэтому роут
// рендерится на сервере под запрос, а не отдаётся статической оболочкой.
export const instant = false;

type Props = {
  searchParams: Promise<{ profession?: string | string[] }>;
};

export default async function DemoRoute({ searchParams }: Props) {
  const { profession } = await searchParams;
  // Ссылка из каталога: /demo?profession=<id | slug>
  const initialProfessionId = Array.isArray(profession)
    ? profession[0]
    : profession;

  return <DemoMapPage initialProfessionId={initialProfessionId} />;
}
