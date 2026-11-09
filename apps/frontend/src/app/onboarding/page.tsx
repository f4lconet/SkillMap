import { Suspense } from 'react';
import { OnboardingWizard } from '@/widgets/onboarding/OnboardingWizard';

export const metadata = {
  title: 'Онбординг — SkillMap',
  description: 'Отметьте навыки и постройте персональную карту за 3 минуты.',
};

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-page text-secondary">
          Загрузка…
        </div>
      }
    >
      <OnboardingWizard />
    </Suspense>
  );
}
