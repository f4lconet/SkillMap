import { Suspense } from 'react';
import { PublicMapLoading, PublicMapPage } from '@/widgets/public-map';

export const metadata = {
  title: 'Публичная карта навыков — SkillMap',
  description:
    'Публичная карта навыков пользователя SkillMap: освоенные навыки, прогресс и следующий шаг.',
};

type Props = {
  params: Promise<{ username: string }>;
};

export default function PublicMapRoute({ params }: Props) {
  return (
    <Suspense fallback={<PublicMapLoading />}>
      <PublicMapRouteContent params={params} />
    </Suspense>
  );
}

async function PublicMapRouteContent({ params }: Props) {
  const { username } = await params;
  return <PublicMapPage username={username} />;
}