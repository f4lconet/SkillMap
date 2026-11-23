import { Suspense } from 'react';
import { PublicMapLoading, PublicMapPage } from '@/widgets/public-map';

export const metadata = {
  title: 'Публичная карта навыков — SkillMap',
  description:
    'Публичная карта навыков пользователя SkillMap: освоенные навыки, прогресс и следующий шаг.',
};

type Props = {
  params: Promise<{ token: string }>;
};

/** Legacy-ссылка /public/{token} — тот же read-only экран, что и /u/{username}. */
export default function PublicMapByTokenRoute({ params }: Props) {
  return (
    <Suspense fallback={<PublicMapLoading />}>
      <PublicMapByTokenRouteContent params={params} />
    </Suspense>
  );
}

async function PublicMapByTokenRouteContent({ params }: Props) {
  const { token } = await params;
  return <PublicMapPage token={token} />;
}
