'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/shared/ui';
import { ApiClientError } from '@/shared/api';
import { authApi } from '@/features/auth';
import { professionApi, type ProfessionDetail } from '@/entities/profession';
import {
  skillApi,
  type ProfessionSkillNode,
} from '@/entities/skill';
import {
  STEP_ORDER,
  STEP_LABELS,
  USER_LEVEL_LABELS,
  type OnboardingStepId,
  type UserLevel,
} from '@/features/onboarding/model/types';
import {
  masteredSkillIds,
  toOnboardingSkills,
} from '@/features/onboarding/model/skillGroups';
import { OnboardingStepper } from '@/features/onboarding/ui/OnboardingStepper';
import { GoalStep } from '@/features/onboarding/ui/GoalStep';
import { LevelStep } from '@/features/onboarding/ui/LevelStep';
import { HoursStep } from '@/features/onboarding/ui/HoursStep';
import { SkillsStep } from '@/features/onboarding/ui/SkillsStep';
import { RouteSummary } from '@/features/onboarding/ui/RouteSummary';

const AUTH_REDIRECT = '/auth';

export function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const professionParam = searchParams.get('profession');

  const [userName, setUserName] = useState('');
  const [profession, setProfession] = useState<ProfessionDetail | null>(null);
  const [nodes, setNodes] = useState<ProfessionSkillNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapsReady, setMapsReady] = useState(true);

  const [step, setStep] = useState<OnboardingStepId>('goal');
  const [level, setLevel] = useState<UserLevel>('beginner');
  const [hours, setHours] = useState(10);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!authApi.getAccessToken()) {
      router.replace(AUTH_REDIRECT);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const me = await authApi.me();
        if (cancelled) return;

        setUserName(me.name);
        if (me.level) setLevel(me.level);
        if (me.hoursPerWeek) setHours(me.hoursPerWeek);

        if (me.onboardingCompleted) {
          router.replace('/catalog');
          return;
        }

        const professionId = professionParam ?? me.targetProfession?.id;
        if (!professionId) {
          router.replace('/catalog');
          return;
        }

        const [detail, professionMap] = await Promise.all([
          professionApi.getById(professionId),
          skillApi.getProfessionMap(professionId),
        ]);
        if (cancelled) return;

        setProfession(detail);
        setNodes(professionMap.skills);
        setMapsReady(professionMap.skillsReady && professionMap.skills.length > 0);
        setSelectedSkillIds(masteredSkillIds(professionMap.skills));
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiClientError && err.status === 401) {
          router.replace(AUTH_REDIRECT);
          return;
        }
        setLoadError(
          'Не удалось загрузить данные профессии. Проверьте соединение и попробуйте снова.'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [professionParam, router]);

  const skills = useMemo(() => toOnboardingSkills(nodes), [nodes]);

  const selectedSet = useMemo(
    () => new Set(selectedSkillIds),
    [selectedSkillIds]
  );

  const remainingHours = useMemo(
    () =>
      skills.reduce(
        (sum, skill) =>
          selectedSet.has(skill.id) ? sum : sum + (skill.estimatedHours ?? 0),
        0
      ),
    [skills, selectedSet]
  );

  const stepIndex = STEP_ORDER.indexOf(step);

  const meta = {
    goal: profession?.title ?? '—',
    level: USER_LEVEL_LABELS[level],
    hours: `${hours} ч в неделю`,
    skills: 'Текущий шаг',
  };

  const goBack = () => {
    if (stepIndex <= 0) {
      router.push('/catalog');
      return;
    }
    setStep(STEP_ORDER[stepIndex - 1]);
  };

  const goNext = () => {
    if (stepIndex >= STEP_ORDER.length - 1) {
      void handleFinish();
      return;
    }
    setStep(STEP_ORDER[stepIndex + 1]);
  };

  const handleFinish = useCallback(async () => {
    if (!profession) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await authApi.updateProfile({
        targetProfessionId: profession.id,
        level,
        hoursPerWeek: hours,
      });

      const alreadyMastered = new Set(masteredSkillIds(nodes));
      const toMark = selectedSkillIds.filter((id) => !alreadyMastered.has(id));
      const results = await Promise.allSettled(
        toMark.map((id) => skillApi.setUserSkill(id, 'mastered'))
      );

      const failed = results.find((r) => r.status === 'rejected');
      if (failed) {
        throw failed.reason;
      }

      await authApi.updateProfile({ onboardingCompleted: true });
      router.push('/catalog');
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        router.replace(AUTH_REDIRECT);
        return;
      }
      setSubmitError(
        'Не удалось сохранить прогресс. Проверьте соединение и попробуйте ещё раз.'
      );
    } finally {
      setSubmitting(false);
    }
  }, [profession, level, hours, nodes, selectedSkillIds, router]);

  const backLabel =
    step === 'goal'
      ? 'Каталог'
      : step === 'level'
        ? 'цель'
        : step === 'hours'
          ? 'уровень'
          : 'часы';

  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-border/60 bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
              S
            </span>
            <span className="text-lg font-semibold text-text">SkillMap</span>
          </Link>
          {userName && <span className="text-sm text-secondary">{userName}</span>}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {loading ? (
          <div className="rounded-2xl border border-border bg-surface px-6 py-16 text-center">
            <p className="text-body text-secondary">Загружаем профессию…</p>
          </div>
        ) : loadError || !profession || !mapsReady ? (
          <div className="rounded-2xl border border-border bg-surface px-6 py-16 text-center">
            <p className="text-section text-text">
              {loadError ?? 'Карта навыков этой профессии ещё готовится'}
            </p>
            <p className="mx-auto mt-2 max-w-md text-body text-secondary">
              {loadError
                ? 'Повторите попытку или выберите профессию в каталоге.'
                : 'Скоро добавим навыки и связи. Пока можно выбрать другую профессию.'}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="secondary" onClick={() => window.location.reload()}>
                Попробовать снова
              </Button>
              <Button variant="primary" onClick={() => router.push('/catalog')}>
                В каталог
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-h2 tracking-tight text-text sm:text-[32px]">
              {step === 'skills'
                ? 'Отметьте то, что уже умеете'
                : step === 'hours'
                  ? 'Сколько времени готовы уделять'
                  : step === 'level'
                    ? 'Выберите целевой уровень'
                    : 'Подтвердите цель'}
            </h1>
            <p className="mt-2 max-w-2xl text-body text-secondary">
              {step === 'skills'
                ? 'Не начинайте с нуля, если у вас уже есть опыт. Позже отметки можно изменить на карте.'
                : 'Ответы сохраняются на каждом шаге. Можно вернуться назад.'}
            </p>

            <div className="mt-6">
              <OnboardingStepper current={step} meta={meta} />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
              <div>
                {step === 'goal' && (
                  <GoalStep professionTitle={profession.title} />
                )}
                {step === 'level' && (
                  <LevelStep value={level} onChange={setLevel} />
                )}
                {step === 'hours' && (
                  <HoursStep value={hours} onChange={setHours} />
                )}
                {step === 'skills' && (
                  <SkillsStep
                    skills={skills}
                    selectedIds={selectedSkillIds}
                    onChange={setSelectedSkillIds}
                  />
                )}
              </div>

              <aside className="lg:sticky lg:top-6 lg:self-start">
                <RouteSummary
                  professionTitle={profession.title}
                  level={level}
                  hoursPerWeek={hours}
                  selectedCount={selectedSkillIds.length}
                  totalSkills={skills.length}
                  remainingHours={remainingHours}
                />
              </aside>
            </div>

            {submitError && (
              <p className="mt-6 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-body text-danger">
                {submitError}
              </p>
            )}

            {/* Footer actions */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
              <Button variant="secondary" onClick={goBack}>
                ← Назад: {backLabel}
              </Button>
              <p className="text-helper text-secondary">
                Шаг {stepIndex + 1} из {STEP_ORDER.length} · {STEP_LABELS[step]}
              </p>
              {step === 'skills' ? (
                <Button
                  variant="primary"
                  onClick={handleFinish}
                  isLoading={submitting}
                >
                  ✦ Построить мою карту
                </Button>
              ) : (
                <Button variant="primary" onClick={goNext}>
                  Далее →
                </Button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
