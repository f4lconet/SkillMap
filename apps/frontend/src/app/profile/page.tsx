import { ProfilePage } from '@/features/profile/ui/ProfilePage';

export const metadata = {
  title: 'Профиль — SkillMap',
  description: 'Личные данные, учебная цель и настройки публичной карты.',
};

export default function ProfileRoute() {
  return <ProfilePage />;
}
