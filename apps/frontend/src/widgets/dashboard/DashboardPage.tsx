'use client';

import Link from 'next/link';
import { AppShell } from '@/widgets/app-shell';
import { useDashboardData } from '@/features/dashboard';
import { USER_LEVEL_LABELS, type UserLevel } from '@/entities/user';
import { ROUTES } from '@/shared/config';
import { Button } from '@/shared/ui';
import { DashboardGreeting } from './dashboard-greeting';
import { KpiOverview } from './kpi-overview';
import { LearningRhythm } from './learning-rhythm';
import { NextStep } from './next-step';
import { ProgressChart } from './progress-chart';
import { RecentAchievements } from './recent-achievements';
import { StudyShortcuts } from './study-shortcuts';

function levelLabelOf(level: string | null | undefined): string | undefined {
  if (!level) return undefined;
  return USER_LEVEL_LABELS[level as UserLevel] ?? level;
}

export function DashboardPage() {
  const { user, dashboard, loading, error, reload } = useDashboardData();

  const kpi = dashboard?.kpi ?? null;
  const hasGoal = Boolean(kpi?.targetProfessionTitle);

  const shellProps = {
    breadcrumb: ['Моё обучение', 'Дашборд'],
    userName: user?.name,
    userRole: user?.role,
    goalTitle: kpi?.targetProfessionTitle ?? undefined,
    goalProgress: kpi ? Math.round(kpi.progressPercent) : 0,
    userLevel: levelLabelOf(kpi?.level),
  };

  if (loading && !dashboard) {
    return (
      <AppShell {...shellProps}>
        <div className="mx-auto max-w-[1080px] px-4 py-16 text-center text-[15px] text-secondary sm:px-6">
          Собираем ваш прогресс…
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell {...shellProps}>
        <div className="mx-auto max-w-[1080px] px-4 py-16 sm:px-6">
          <div className="rounded-2xl border border-danger/30 bg-danger-soft px-5 py-4 text-[15px] text-danger">
            {error}
          </div>
          <Button variant="primary" className="mt-4" onClick={() => void reload()}>
            Повторить
          </Button>
        </div>
      </AppShell>
    );
  }

  if (!dashboard || !hasGoal) {
    return (
      <AppShell {...shellProps}>
        <div className="mx-auto w-full max-w-[1080px] px-4 py-4 sm:px-6 sm:py-6">
          <DashboardGreeting
            userName={user?.name ?? ''}
            professionTitle={null}
            level={null}
          />
          <section className="mt-6 rounded-2xl border border-border bg-white p-6">
            <h2 className="text-lg font-semibold">Профессия ещё не выбрана</h2>
            <p className="mt-1 max-w-xl text-sm text-secondary">
              Выберите направление — и SkillMap построит карту навыков, gap-анализ и
              план по неделям.
            </p>
            <Link href={ROUTES.catalog}>
              <Button variant="primary" className="mt-5">
                Выбрать профессию
              </Button>
            </Link>
          </section>
        </div>
      </AppShell>
    );
  }

  const nextStep = dashboard.nextSteps[0] ?? null;

  return (
    <AppShell {...shellProps}>
      <div className="mx-auto w-full max-w-[1080px] px-4 py-4 sm:px-6 sm:py-6">
        <DashboardGreeting
          userName={user?.name ?? ''}
          professionTitle={dashboard.kpi.targetProfessionTitle}
          level={dashboard.kpi.level}
        />

        <div className="mt-6">
          <KpiOverview kpi={dashboard.kpi} weekActivity={dashboard.weekActivity} />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.45fr_0.9fr]">
          <ProgressChart history={dashboard.progressHistory} />
          <LearningRhythm activity={dashboard.weekActivity} />
        </div>

        <div className="mt-5 grid items-stretch gap-4 sm:gap-5 lg:grid-cols-[1.45fr_0.9fr]">
          <div className="flex flex-col gap-4">
            <NextStep step={nextStep} kpi={dashboard.kpi} />
            <StudyShortcuts
              step={nextStep}
              remainingHours={dashboard.kpi.estimatedRemainingHours}
            />
          </div>
          <RecentAchievements items={dashboard.recentAchievements} />
        </div>
      </div>
    </AppShell>
  );
}
