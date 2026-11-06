import { CatalogPage } from '@/widgets/catalog/CatalogPage';

export const metadata = {
  title: 'Каталог профессий — SkillMap',
  description:
    'Профессии с картами навыков. Выберите цель и постройте персональный маршрут обучения.',
};

export default function CatalogRoute() {
  return <CatalogPage />;
}