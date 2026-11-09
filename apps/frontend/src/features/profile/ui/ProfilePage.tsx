'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/widgets/app-shell';
import { Badge, Button, Input, Progress, Select, Toggle } from '@/shared/ui';
import { ApiClientError } from '@/shared/api';
import { authApi } from '@/features/auth';
import type { Profession } from '@/entities/profession';
import {
  USER_LEVEL_LABELS,
  USER_ROLE_LABELS,
  type User,
  type UserLevel,
} from '@/entities/user';
import { useProfileData } from '../model/useProfileData';

const HOURS_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40];

const LEVEL_OPTIONS: { value: UserLevel; label: string }[] = (
  ['beginner', 'intermediate', 'advanced'] as UserLevel[]
).map((value) => ({ value, label: USER_LEVEL_LABELS[value] }));

function formatTime(date: Date): string {
  const now = new Date();
  const isToday = now.toDateString() === date.toDateString();
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`;
  return isToday
    ? `сегодня, ${time}`
    : `${date.toLocaleDateString('ru-RU')}, ${time}`;
}

type FormState = {
  name: string;
  level: UserLevel;
  hours: number;
  professionId: string;
};

function toFormState(user: User): FormState {
  return {
    name: user.name,
    level: user.level ?? 'beginner',
    hours: user.hoursPerWeek ?? 10,
    professionId: user.targetProfession?.id ?? '',
  };
}

function isDirty(form: FormState, user: User): boolean {
  const base = toFormState(user);
  return (
    form.name.trim() !== base.name.trim() ||
    form.level !== base.level ||
    form.hours !== base.hours ||
    form.professionId !== base.professionId
  );
}

type FormProps = {
  user: User;
  professions: Profession[];
  trajectoryWeeks: number | null;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: (user: User) => Promise<void>;
};

function ProfileSettingsForm({
  user,
  professions,
  trajectoryWeeks,
  onDirtyChange,
  onSaved,
}: FormProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(user));
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const dirty = isDirty(form, user);

  const apply = (patch: Partial<FormState>) => {
    const next = { ...form, ...patch };
    setForm(next);
    setSaveError(null);
    onDirtyChange(isDirty(next, user));
  };

  const hoursOptions = useMemo(() => {
    const values = HOURS_OPTIONS.includes(form.hours)
      ? HOURS_OPTIONS
      : [...HOURS_OPTIONS, form.hours].sort((a, b) => a - b);
    return values.map((value) => ({
      value: String(value),
      label: `${value} часов`,
    }));
  }, [form.hours]);

  const professionOptions = useMemo(
    () => [
      { value: '', label: 'Цель не выбрана' },
      ...professions.map((p) => ({ value: p.id, label: p.title })),
    ],
    [professions]
  );

  const weeksHint = (() => {
    if (!form.professionId) return 'Расчёт появится после выбора профессии';
    if (trajectoryWeeks === null)
      return 'Оценка появится после заполнения карты навыков';
    if (form.hours !== (user.hoursPerWeek ?? 0))
      return 'План пересчитается после сохранения';
    return `План: ${trajectoryWeeks} нед. при текущей нагрузке`;
  })();

  const handleSave = async () => {
    const trimmed = form.name.trim();
    if (!trimmed) {
      setNameError('Укажите имя');
      return;
    }
    if (trimmed.length > 100) {
      setNameError('Не больше 100 символов');
      return;
    }
    setNameError(null);
    setSaveError(null);
    setSaving(true);
    try {
      const updated = await authApi.updateProfile({
        name: trimmed,
        level: form.level,
        hoursPerWeek: Math.min(40, Math.max(1, form.hours)),
        targetProfessionId: form.professionId || null,
      });
      await onSaved(updated);
      onDirtyChange(false);
      setSavedAt(formatTime(new Date()));
    } catch (err) {
      setSaveError(
        err instanceof ApiClientError
          ? err.message
          : 'Не удалось сохранить изменения'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-section text-text">Личные данные и цель</h2>

      <div className="mt-4 space-y-4">
        <Input
          label="Имя"
          name="name"
          value={form.name}
          onChange={(e) => {
            setNameError(null);
            apply({ name: e.target.value });
          }}
          error={Boolean(nameError)}
          errorText={nameError ?? undefined}
          maxLength={100}
        />
        <Select
          label="Профессия"
          value={form.professionId}
          onChange={(e) => apply({ professionId: e.target.value })}
          options={professionOptions}
          helperText="Gap Analysis и план пересчитаются автоматически"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Уровень"
            value={form.level}
            onChange={(e) => apply({ level: e.target.value as UserLevel })}
            options={LEVEL_OPTIONS}
          />
          <Select
            label="Часов в неделю"
            value={String(form.hours)}
            onChange={(e) => apply({ hours: Number(e.target.value) })}
            options={hoursOptions}
            helperText={weeksHint}
          />        </div>
      </div>

      {saveError && (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-helper text-danger">
          {saveError}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-helper text-secondary">
          {savedAt && !dirty
            ? `Сохранено ${savedAt}`
            : dirty
              ? 'Изменения ещё не сохранены'
              : 'План пересчитывается при изменении нагрузки'}
        </p>
        <Button
          variant="primary"
          onClick={() => void handleSave()}
          isLoading={saving}
          disabled={!dirty || saving}
        >
          Сохранить изменения
        </Button>
      </div>
    </section>
  );
}

export function ProfilePage() {
  const router = useRouter();
  const {
    user,
    professions,
    gap,
    trajectory,
    loading,
    error,
    reload,
    applyUser,
  } = useProfileData();

  const [dirty, setDirty] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const goalTitle = user?.targetProfession?.title ?? 'Цель не выбрана';
  const progressPercent = gap?.progressPercent ?? 0;
  const masteredCount = gap?.mastered.length ?? 0;
  const totalSkills = gap?.totalSkills ?? 0;
  const masteredHours = (gap?.mastered ?? []).reduce(
    (sum, item) => sum + (item.skill.estimatedHours ?? 0),
    0
  );
  const remainingHours = gap?.estimatedRemainingHours ?? null;
  const userInitials = (user?.name ?? '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handlePasswordReset = async () => {
    if (!user) return;
    setResetLoading(true);
    setResetMessage(null);
    setResetError(null);
    try {
      setResetMessage(await authApi.forgotPassword({ email: user.email }));
    } catch (err) {
      setResetError(
        err instanceof Error ? err.message : 'Не удалось отправить письмо'
      );
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogout = async () => {
    await authApi.logout();
    router.push('/');
  };

  if (loading && !user) {
    return (
      <AppShell breadcrumb={['Моё обучение', 'Профиль']}>
        <div className="mx-auto max-w-5xl px-4 py-16 text-center text-body text-secondary sm:px-6">
          Загружаем профиль…
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell breadcrumb={['Моё обучение', 'Профиль']}>
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <div className="rounded-2xl border border-danger/30 bg-danger-soft px-5 py-4 text-body text-danger">
            {error ?? 'Профиль недоступен'}
          </div>
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => void reload()}
          >
            Повторить
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      breadcrumb={['Моё обучение', 'Профиль']}
      savedHint={
        dirty ? 'Есть несохранённые изменения' : 'Все изменения сохранены'
      }
      userName={user.name}
      userRole={USER_ROLE_LABELS[user.role]}
      goalTitle={goalTitle}
      goalProgress={progressPercent}
      userLevel={USER_LEVEL_LABELS[user.level ?? 'beginner']}
    >
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-h2 tracking-tight text-text">Ваш профиль</h1>
            <p className="mt-1 text-body text-secondary">
              Личные данные, учебная цель и настройки публичной карты.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void handleLogout()}
          >
            Выйти из аккаунта
          </Button>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-danger/30 bg-danger-soft px-5 py-3 text-helper text-danger">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-5">
            {/* Basic info */}
            <section className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="text-section text-text">Основная информация</h2>
              <div className="mt-4 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-section font-semibold text-accent">
                  {userInitials || '·'}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-section text-text">{user.name}</p>
                  <p className="text-helper text-secondary">
                    {USER_ROLE_LABELS[user.role]} · {goalTitle}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <Input
                    label="Электронная почта"
                    name="email"
                    value={user.email}
                    disabled
                    readOnly
                  />
                  <p
                    className={
                      user.isEmailVerified
                        ? 'mt-1.5 text-helper text-success'
                        : 'mt-1.5 text-helper text-secondary'
                    }
                  >
                    {user.isEmailVerified
                      ? '✓ Email подтверждён'
                      : '• Email не подтверждён'}
                  </p>
                </div>
                <div>
                  <Input
                    label="Роль"
                    name="role"
                    value={USER_ROLE_LABELS[user.role]}
                    disabled
                    readOnly
                  />
                  <p className="mt-1.5 text-helper text-secondary">
                    Определяется при регистрации
                  </p>
                </div>
              </div>
            </section>

            <ProfileSettingsForm
              key={`${user.id}:${user.name}:${user.level}:${user.hoursPerWeek}:${
                user.targetProfession?.id ?? ''
              }`}
              user={user}
              professions={professions}
              trajectoryWeeks={trajectory?.totalWeeks ?? null}
              onDirtyChange={setDirty}
              onSaved={applyUser}
            />

            {/* Public map */}
            <section className="rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-section text-text">Публичная карта</h2>
                    <Badge variant="locked">Скоро</Badge>
                  </div>
                  <p className="mt-1 text-body font-medium text-text">
                    Карта доступна по ссылке
                  </p>
                  <p className="text-helper text-secondary">
                    Покажите навыки и прогресс без личных настроек.
                  </p>
                </div>
                <Toggle
                  checked={false}
                  readOnly
                  disabled
                  aria-label="Публичная карта"
                />
              </div>

              <div className="mt-4 rounded-xl border border-dashed border-border bg-page px-3 py-2.5 text-helper text-secondary">
                Публичная ссылка появится вместе с картой навыков
              </div>
              <p className="mt-2 text-helper text-secondary">
                Email и учебный план не публикуются
              </p>
            </section>

            {/* Notifications */}
            <section className="rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-center gap-2">
                <h2 className="text-section text-text">
                  Уведомления и безопасность
                </h2>
                <Badge variant="locked">Скоро</Badge>
              </div>

              <div className="mt-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-body font-medium text-text">
                      Напоминания об обучении
                    </p>
                    <p className="text-helper text-secondary">
                      Раз в неделю — короткое письмо о вашем плане.
                    </p>
                  </div>
                  <Toggle checked={false} readOnly disabled />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-body font-medium text-text">
                      Новости SkillMap
                    </p>
                    <p className="text-helper text-secondary">
                      Обновления сервиса и новые профессии.
                    </p>
                  </div>
                  <Toggle checked={false} readOnly disabled />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <div>
                  <p className="text-helper text-secondary">
                    Вход по email и паролю
                  </p>
                  {resetMessage && (
                    <p className="mt-1 text-helper text-success">{resetMessage}</p>
                  )}
                  {resetError && (
                    <p className="mt-1 text-helper text-danger">{resetError}</p>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={resetLoading}
                  onClick={() => void handlePasswordReset()}
                >
                  Изменить пароль
                </Button>
              </div>
            </section>
          </div>

          {/* Right column */}
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl border border-accent/15 bg-accent-soft/50 p-5">
              <p className="text-helper font-semibold text-secondary">
                Ваш путь
              </p>
              <p className="mt-1 text-body text-text">
                {goalTitle} · {USER_LEVEL_LABELS[user.level ?? 'beginner']}
              </p>
              <p className="mt-3 text-4xl font-bold tracking-tight text-text">
                {Math.round(progressPercent)}%
              </p>
              <div className="mt-2">
                <Progress value={progressPercent} showValue={false} />
              </div>
              {totalSkills > 0 ? (
                <>
                  <p className="mt-3 text-helper text-secondary">
                    {masteredCount} из {totalSkills} навыков освоено
                  </p>
                  <p className="text-helper text-secondary">
                    {masteredHours} ч в освоенных навыках
                  </p>
                  {remainingHours !== null && (
                    <p className="text-helper text-secondary">
                      Осталось примерно {remainingHours} ч
                      {trajectory?.totalWeeks
                        ? ` · ${trajectory.totalWeeks} нед.`
                        : ''}
                    </p>
                  )}
                </>
              ) : user.targetProfession ? (
                <p className="mt-3 text-helper text-secondary">
                  Карта навыков для этой профессии ещё не заполнена
                </p>
              ) : (
                <p className="mt-3 text-helper text-secondary">
                  Выберите профессию, чтобы увидеть прогресс.
                </p>
              )}
              <Link
                href="/catalog"
                className="mt-4 inline-block text-helper font-medium text-accent hover:underline"
              >
                Открыть каталог профессий →
              </Link>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5">
              <p className="text-body font-medium text-text">Что сохраняется</p>
              <p className="mt-1 text-helper text-secondary">
                Отметки навыков, учебная траектория и прогресс привязаны к
                аккаунту и синхронизируются с сервером.
              </p>
            </div>

            <div className="rounded-2xl border border-danger/20 bg-danger-soft/40 p-5">
              <div className="flex items-center gap-2">
                <p className="text-body font-semibold text-danger">
                  Удаление аккаунта
                </p>
                <Badge variant="locked">Скоро</Badge>
              </div>
              <p className="mt-1 text-helper text-secondary">
                Аккаунт, отметки и учебный план будут удалены без возможности
                восстановления.
              </p>
              <Button variant="destructive" size="sm" className="mt-4" disabled>
                Удалить аккаунт и данные
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
