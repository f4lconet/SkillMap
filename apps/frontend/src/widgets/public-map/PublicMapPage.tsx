'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Edge, Node } from '@xyflow/react';
import { Button, Logo, Progress } from '@/shared/ui';
import {
  SkillMapCanvas,
  buildSkillGraph,
  nodeStatusColor,
  type SkillMapNodeData,
} from '@/features/skill-map';
import { PublicSkillDetailPanel } from '@/features/public-map';
import { publicProfileApi, type PublicProfile } from '@/entities/public-profile';
import { USER_LEVEL_LABELS } from '@/entities/user';
import { ApiClientError } from '@/shared/api';
import { pluralSkills } from '@/shared/lib/format';

/** Данные публичной карты, подготовленные для отрисовки. */
type PublicMapView = {
  username: string;
  displayName: string;
  initials: string;
  bio: string;
  goal: string;
  level: string;
  updatedAt: string | null;
  progressPercent: number;
  skillsMastered: number;
  skillsTotal: number;
  skillsInProgress: number;
  nodes: Node<SkillMapNodeData>[];
  edges: Edge[];
};

type LoadStatus = 'loading' | 'ready' | 'not-found' | 'error';

type Props =
  | { username: string; token?: undefined }
  | { token: string; username?: undefined };

export function PublicMapPage({ username, token }: Props) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      let data: PublicProfile;
      if (username) {
        data = await publicProfileApi.getByUsername(username);
      } else if (token) {
        data = await publicProfileApi.getByToken(token);
      } else {
        setStatus('not-found');
        return;
      }
      setProfile(data);
      setStatus('ready');
    } catch (err) {
      setProfile(null);
      if (err instanceof ApiClientError && err.status === 404) {
        setStatus('not-found');
        return;
      }
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Не удалось загрузить карту');
    }
  }, [username, token]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const view = useMemo(() => (profile ? toView(profile) : null), [profile]);

  const notFoundHint = username
    ? `Пользователь @${username} не открывал карту для просмотра или ссылка устарела.`
    : 'Возможно, автор отключил публичный доступ или ссылка устарела.';

  return (
    <PublicMapContent
      profile={view}
      status={status}
      error={error}
      notFoundHint={notFoundHint}
      onRetry={() => void load()}
    />
  );
}

/**
 * Каркас страницы в состоянии загрузки — фолбэк для `<Suspense>`,
 * чтобы Next.js мог пререндерить статическую оболочку маршрута.
 */
export function PublicMapLoading() {
  return (
    <PublicMapContent
      profile={null}
      status="loading"
      error={null}
      notFoundHint=""
      onRetry={() => {}}
    />
  );
}

type ContentProps = {
  profile: PublicMapView | null;
  status: LoadStatus;
  error: string | null;
  notFoundHint: string;
  onRetry: () => void;
};

function PublicMapContent({
  profile: loaded,
  status,
  error,
  notFoundHint,
  onRetry,
}: ContentProps) {
  const profile = loaded ?? EMPTY_VIEW;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // По умолчанию подсвечиваем ближайший доступный навык — «следующий шаг».
  const nextStepId = useMemo(() => {
    const available = profile.nodes.find((n) => n.data.status === 'available');
    return available?.id ?? profile.nodes[0]?.id ?? null;
  }, [profile.nodes]);

  const activeId = selectedId ?? nextStepId;

  const selected = useMemo(
    () => profile.nodes.find((n) => n.id === activeId)?.data ?? null,
    [profile.nodes, activeId]
  );

  const masteredShown = profile.nodes.filter((n) => n.data.status === 'mastered')
    .length;

  return (
    <div className="min-h-screen bg-page text-text">
      <header className="border-b border-border/70 bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={32} />
            <span className="text-base font-semibold tracking-tight">SkillMap</span>
          </Link>
          <div className="hidden items-center gap-4 sm:flex sm:gap-5">
            <Link
              href="/catalog"
              className="text-sm font-medium text-secondary hover:text-text"
            >
              Каталог профессий
            </Link>
            <Link
              href="/auth"
              className="text-sm font-medium text-secondary hover:text-text"
            >
              Войти
            </Link>
            <Link href="/onboarding">
              <Button variant="primary" size="sm">
                Создать свою карту
              </Button>
            </Link>
          </div>
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-full border border-border bg-surface px-3.5 text-sm font-medium text-text sm:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="public-mobile-menu"
          >
            Меню
          </button>
        </div>
        {menuOpen && (
          <div
            id="public-mobile-menu"
            className="border-t border-border px-4 py-3 sm:hidden"
          >
            <Link
              href="/catalog"
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-secondary hover:bg-page"
              onClick={() => setMenuOpen(false)}
            >
              Каталог профессий
            </Link>
            <Link
              href="/auth"
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-secondary hover:bg-page"
              onClick={() => setMenuOpen(false)}
            >
              Войти
            </Link>
            <Link
              href="/onboarding"
              className="mt-2 flex h-11 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-white"
              onClick={() => setMenuOpen(false)}
            >
              Создать свою карту
            </Link>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {status !== 'ready' ? (
          <StatusScreen
            status={status}
            error={error}
            notFoundHint={notFoundHint}
            onRetry={onRetry}
          />
        ) : (
          <>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-lg font-semibold text-accent">
              {profile.initials}
            </span>
            <div>
              <h1 className="text-h2 tracking-tight text-text">
                {profile.displayName}
              </h1>
              <p className="mt-1 max-w-xl text-body text-secondary">{profile.bio}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-accent-soft px-2.5 py-1 text-helper font-medium text-accent">
                  {profile.goal}
                </span>
                <span className="rounded-full bg-page px-2.5 py-1 text-helper font-medium text-secondary">
                  {profile.level}
                </span>
                {profile.username && (
                  <span className="rounded-full bg-page px-2.5 py-1 text-helper font-medium text-secondary">
                    @{profile.username}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <section className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-[200px] flex-1">
              <p className="text-helper text-secondary">
                Прогресс до «{profile.goal}»
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-6">
                <p className="text-3xl font-bold tracking-tight text-text">
                  {profile.progressPercent}%
                </p>
                <div>
                  <p className="text-2xl font-bold tracking-tight text-text">
                    {profile.skillsMastered} / {profile.skillsTotal}
                  </p>
                  <p className="text-helper text-secondary">навыков освоено</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight text-text">
                    {profile.skillsInProgress}
                  </p>
                  <p className="text-helper text-secondary">
                    {profile.skillsInProgress}{' '}
                    {pluralSkills(profile.skillsInProgress)} в процессе
                  </p>
                </div>
              </div>
              <div className="mt-4 max-w-md">
                <Progress value={profile.progressPercent} showValue={false} size="sm" />
              </div>
            </div>
            {profile.updatedAt && (
              <span className="rounded-full bg-page px-2.5 py-1 text-helper text-secondary">
                Опубликовано {profile.updatedAt}
              </span>
            )}
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_280px]">
          <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3.5">
              <p className="text-body font-medium text-text">
                Основной трек · {masteredShown} из {profile.nodes.length} навыков
              </p>
              <span className="rounded-full bg-page px-2.5 py-1 text-helper font-medium text-secondary">
                Только просмотр
              </span>
            </div>

            <div className="p-3 sm:p-4">
              <SkillMapCanvas
                nodes={profile.nodes}
                edges={profile.edges}
                filter="all"
                search=""
                selectedId={activeId}
                onSelect={setSelectedId}
                readOnly
                className="h-[320px] w-full rounded-xl sm:h-[440px]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t border-border px-5 py-3 text-helper text-secondary">
              <LegendDot color={nodeStatusColor.mastered} label="Освоен" />
              <LegendDot color={nodeStatusColor['in-progress']} label="В процессе" />
              <LegendDot color={nodeStatusColor.available} label="Можно начать" />
              <LegendDot color={nodeStatusColor.locked} label="Недоступен" />
            </div>
          </section>

          <div className="lg:sticky lg:top-6 lg:self-start">
            <PublicSkillDetailPanel data={selected} />
          </div>
        </div>

        <p className="mt-3 text-helper text-secondary">
          Показан основной трек. Выбирайте навыки, чтобы узнать их содержание и
          связи.
        </p>

        <section className="mt-6 flex flex-col gap-4 rounded-2xl bg-[#182137] px-5 py-5 text-white sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-xl opacity-90" aria-hidden>
              ⧉
            </span>
            <div>
              <p className="text-section font-semibold text-white">
                Ваш путь тоже можно сделать видимым.
              </p>
              <p className="mt-1 text-body text-white/70">
                Выберите цель и получите личную карту навыков за 3 минуты.
              </p>
            </div>
          </div>
          <Link href="/onboarding">
            <Button
              variant="primary"
              className="w-full shrink-0 bg-accent hover:bg-[#4448C4] sm:w-auto"
            >
              → Начать бесплатно
            </Button>
          </Link>
        </section>
          </>
        )}
      </main>
    </div>
  );
}

function StatusScreen({
  status,
  error,
  notFoundHint,
  onRetry,
}: {
  status: LoadStatus;
  error: string | null;
  notFoundHint: string;
  onRetry: () => void;
}) {
  if (status === 'loading') {
    return (
      <div className="flex h-[40vh] items-center justify-center text-body text-secondary">
        Загружаем публичную карту…
      </div>
    );
  }

  const isNotFound = status === 'not-found';

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-h3 text-text">
        {isNotFound ? 'Карта не найдена' : 'Не удалось загрузить карту'}
      </p>
      <p className="mt-2 text-body text-secondary">
        {isNotFound
          ? notFoundHint
          : (error ?? 'Попробуйте обновить страницу чуть позже.')}
      </p>
      <div className="mt-5 flex justify-center gap-3">
        {!isNotFound && (
          <Button variant="secondary" onClick={onRetry}>
            Повторить
          </Button>
        )}
        <Link href="/">
          <Button variant="primary">На главную</Button>
        </Link>
      </div>
    </div>
  );
}

const EMPTY_VIEW: PublicMapView = {
  username: '',
  displayName: '',
  initials: '',
  bio: '',
  goal: '',
  level: '',
  updatedAt: null,
  progressPercent: 0,
  skillsMastered: 0,
  skillsTotal: 0,
  skillsInProgress: 0,
  nodes: [],
  edges: [],
};

/** PublicMapResponse → данные для отрисовки карты. */
function toView(api: PublicProfile): PublicMapView {
  const graph = buildSkillGraph(api.map);
  const professionTitle = api.professionTitle ?? api.map?.professionTitle ?? null;

  return {
    username: api.username ?? '',
    displayName: api.ownerName,
    initials: initialsOf(api.ownerName),
    bio: professionTitle
      ? `Публичная карта навыков: путь к профессии «${professionTitle}».`
      : 'Публичная карта навыков пользователя SkillMap.',
    goal: professionTitle ?? 'Цель пока не выбрана',
    level: api.ownerLevel ? USER_LEVEL_LABELS[api.ownerLevel] : 'Уровень не указан',
    updatedAt: api.sharedAt ? formatDate(api.sharedAt) : null,
    progressPercent: Math.round(api.gap.matchPercent),
    skillsMastered: api.gap.masteredCount,
    skillsTotal: api.map?.totalSkills ?? api.gap.totalSkills,
    skillsInProgress: api.gap.learningCount,
    nodes: graph.nodes,
    edges: graph.edges,
  };
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? (parts[1]?.[0] ?? '') : '';
  return (first + second).toUpperCase();
}

function formatDate(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}