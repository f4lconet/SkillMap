'use client';

import Link from 'next/link';
import { AdminShell } from '@/widgets/admin-shell';
import { Button } from '@/shared/ui/button/Button';
import { cn } from '@/shared/lib/cn';
import { useSessionUser } from '@/features/auth';
import { useAdminOverview } from '@/features/admin-overview';
import {
  formatDate,
  formatDateTime,
  PROFESSION_LEVEL_LABELS,
} from '@/entities/admin-graph';
import {
  ADMIN_ENTITY_LABELS,
  eventActorName,
  formatRelativeTime,
  type AdminEvent,
} from '@/entities/admin-event';
import type { AdminOverview } from '@/entities/admin-overview';
import { USER_ROLE_LABELS, type UserRole } from '@/entities/user';

const ISSUE_FORMS: [string, string, string] = [
  'замечание',
  'замечания',
  'замечаний',
];

const SKILL_FORMS: [string, string, string] = ['навык', 'навыка', 'навыков'];
const DEPENDENCY_FORMS: [string, string, string] = [
  'зависимость',
  'зависимости',
  'зависимостей',
];
const RESOURCE_FORMS: [string, string, string] = [
  'материал',
  'материала',
  'материалов',
];
const LINK_FORMS: [string, string, string] = ['связь', 'связи', 'связей'];

function plural(count: number, forms: [string, string, string]): string {
  const mod10 = Math.abs(count) % 10;
  const mod100 = Math.abs(count) % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

function countLabel(count: number, forms: [string, string, string]): string {
  return `${count} ${plural(count, forms)}`;
}

type StatCard = {
  label: string;
  value: number;
  hint: string;
  tone: 'neutral' | 'success' | 'warning';
};

const TONE_CLASSES: Record<StatCard['tone'], string> = {
  neutral: 'text-secondary',
  success: 'text-success',
  warning: 'text-warning',
};

function buildStats(data: AdminOverview): StatCard[] {
  const { stats, checklist } = data;
  const covered = Math.max(stats.skills - checklist.skillsWithoutResources, 0);

  const attentionHints: string[] = [];
  if (checklist.skillsWithoutResources > 0) {
    attentionHints.push(
      `${checklist.skillsWithoutResources} без материалов`
    );
  }
  if (stats.needsReviewResources > 0) {
    attentionHints.push(`${stats.needsReviewResources} на проверке`);
  }
  if (stats.brokenLinks > 0) {
    attentionHints.push(`${stats.brokenLinks} с битой ссылкой`);
  }
  if (checklist.brokenDependencies > 0) {
    attentionHints.push(`${checklist.brokenDependencies} связей вне карты`);
  }

  return [
    {
      label: 'Навыки',
      value: stats.skills,
      hint: `${countLabel(stats.layers, [
        'уровень',
        'уровня',
        'уровней',
      ])} · структура карты`,
      tone: 'neutral',
    },
    {
      label: 'Зависимости',
      value: stats.dependencies,
      hint:
        checklist.cycle.length > 0
          ? `Цикл: ${countLabel(checklist.cycle.length, SKILL_FORMS)}`
          : checklist.brokenDependencies > 0
            ? `${countLabel(checklist.brokenDependencies, LINK_FORMS)} не видны на карте`
            : 'Циклов не найдено',
      tone:
        checklist.cycle.length > 0 || checklist.brokenDependencies > 0
          ? 'warning'
          : 'success',
    },
    {
      label: 'Учебные ресурсы',
      value: stats.resources,
      hint: `${covered} из ${stats.skills} навыков с материалами`,
      tone: checklist.resourcesReady ? 'success' : 'warning',
    },
    {
      label: 'Требуют внимания',
      value: stats.attention,
      hint:
        attentionHints.length > 0
          ? attentionHints.join(' · ')
          : 'Всё готово к публикации',
      tone: stats.attention > 0 ? 'warning' : 'success',
    },
  ];
}

type ChecklistRow = {
  title: string;
  description: string;
  ok: boolean;
  badge: string;
};

function buildChecklist(data: AdminOverview): ChecklistRow[] {
  const { stats, checklist, skillsWithoutResources } = data;
  const cycleBroken = checklist.cycle.length > 0;
  const graphIssues = (cycleBroken ? 1 : 0) + checklist.brokenDependencies;

  const materialIssues: string[] = [];
  if (stats.needsReviewResources > 0) {
    materialIssues.push(`${stats.needsReviewResources} ждут проверки`);
  }
  if (stats.brokenLinks > 0) {
    materialIssues.push(`${stats.brokenLinks} с битой ссылкой`);
  }
  if (checklist.uncheckedLinks > 0) {
    materialIssues.push(`${checklist.uncheckedLinks} без проверки ссылки`);
  }

  const withoutMaterials = skillsWithoutResources
    .slice(0, 3)
    .map((node) => node.title)
    .join(', ');

  return [
    {
      title: 'Структура графа',
      description: cycleBroken
        ? `Найден цикл зависимостей: ${countLabel(checklist.cycle.length, SKILL_FORMS)}`
        : checklist.brokenDependencies > 0
          ? `${countLabel(checklist.brokenDependencies, LINK_FORMS)} не отображаются на карте`
          : 'Нет циклов и разорванных зависимостей',
      ok: checklist.graphReady,
      badge:
        graphIssues > 0
          ? countLabel(graphIssues, ISSUE_FORMS)
          : 'Корректно',
    },
    {
      title: 'Покрытие навыков',
      description: checklist.resourcesReady
        ? `Для всех ${stats.skills} навыков добавлены материалы`
        : `Без материалов: ${withoutMaterials}${
            skillsWithoutResources.length > 3 ? '…' : ''
          }`,
      ok: checklist.resourcesReady,
      badge: `${stats.skills - checklist.skillsWithoutResources} / ${stats.skills}`,
    },
    {
      title: 'Учебные материалы',
      description:
        materialIssues.length > 0
          ? materialIssues.join(' · ')
          : `${countLabel(stats.resources, RESOURCE_FORMS)} опубликованы и доступны`,
      ok: materialIssues.length === 0,
      badge:
        materialIssues.length > 0
          ? countLabel(
              stats.needsReviewResources +
                stats.brokenLinks +
                checklist.uncheckedLinks,
              ISSUE_FORMS
            )
          : 'Корректно',
    },
  ];
}

function ChecklistItem({ item }: { item: ChecklistRow }) {
  return (
    <li className="flex items-start justify-between gap-3 border-b border-border/70 pb-4 last:border-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text">{item.title}</p>
        <p className="mt-0.5 text-xs text-secondary">{item.description}</p>
      </div>
      <span
        className={cn(
          'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium',
          item.ok ? 'bg-success-soft text-success' : 'bg-[#FFF8E8] text-warning'
        )}
      >
        {item.badge}
      </span>
    </li>
  );
}

function RecentItem({ event }: { event: AdminEvent }) {
  return (
    <li className="flex items-start gap-3 border-b border-border/70 py-3.5 last:border-0">
      <span className="w-16 shrink-0 pt-0.5 text-xs text-secondary">
        {formatRelativeTime(event.createdAt)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text">{event.title}</p>
        <p className="mt-0.5 text-xs text-secondary">
          {event.detail ? `${event.detail} · ` : ''}
          {eventActorName(event)}
        </p>
      </div>
      <span className="shrink-0 rounded-full border border-border bg-page px-2.5 py-0.5 text-xs font-medium text-secondary">
        {ADMIN_ENTITY_LABELS[event.entityType]}
      </span>
    </li>
  );
}

const secondaryLink =
  'inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text hover:bg-page';

export function AdminOverviewPage() {
  const {
    professions,
    selectedProfessionId,
    overview,
    loading,
    refreshing,
    publishing,
    error,
    toast,
    selectProfession,
    reload,
    publish,
    dismissToast,
  } = useAdminOverview();
  const { user } = useSessionUser();

  const profession = overview?.profession ?? null;
  const stats = overview ? buildStats(overview) : [];
  const checklist = overview ? buildChecklist(overview) : [];
  const allChecksPassed = checklist.every((item) => item.ok);

  const saveStatus = profession
    ? profession.draftSavedAt
      ? `Черновик сохранён ${formatDateTime(profession.draftSavedAt)}`
      : 'Изменений нет'
    : undefined;

  const publication = profession
    ? {
        title: `${profession.title} · версия ${profession.contentVersion}`,
        badge: overview?.hasUnpublishedChanges ? 'Есть черновик' : 'Опубликовано',
        tone: (overview?.hasUnpublishedChanges ? 'warning' : 'success') as
          | 'warning'
          | 'success',
      }
    : null;

  const handlePublish = () => {
    if (!overview?.hasUnpublishedChanges) return;
    const confirmed = window.confirm(
      'Опубликовать изменения? Студенты сразу увидят новую версию карты.'
    );
    if (confirmed) void publish();
  };

  return (
    <AdminShell
      breadcrumb={['Редакторская', 'Обзор']}
      saveStatus={saveStatus}
      onReload={() => void reload()}
      publication={publication}
      user={
        user
          ? { name: user.name, role: USER_ROLE_LABELS[user.role as UserRole] }
          : null
      }
    >
      <div className="mx-auto max-w-[1120px] px-4 py-8 sm:px-6">
        {toast && (
          <button
            type="button"
            onClick={dismissToast}
            className={cn(
              'mb-4 block w-full rounded-xl border px-4 py-2.5 text-left text-xs font-medium',
              toast.tone === 'success'
                ? 'border-success/20 bg-success-soft text-success'
                : 'border-danger/20 bg-danger-soft text-danger'
            )}
          >
            {toast.message}
          </button>
        )}

        {error && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/20 bg-danger-soft px-4 py-2.5 text-xs text-danger">
            <span>{error}</span>
            <Button variant="secondary" size="sm" onClick={() => void reload()}>
              Повторить
            </Button>
          </div>
        )}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-accent">
              Редакторская · Контент профессии
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-text">
              Обзор редакторской
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-secondary">
              Состояние карты, качество материалов и всё, что важно перед
              публикацией.
            </p>
          </div>
          <Link href="/admin/graph" className={cn(secondaryLink, 'shrink-0')}>
            Открыть редактор графа
          </Link>
        </div>

        <div className="mb-6 flex flex-wrap items-end gap-4">
          <label className="min-w-[200px] flex-1">
            <span className="mb-1.5 block text-xs font-medium text-secondary">
              Профессия
            </span>
            <select
              value={selectedProfessionId ?? ''}
              onChange={(event) => selectProfession(event.target.value)}
              disabled={loading || professions.length === 0}
              className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text disabled:text-secondary"
            >
              {professions.length === 0 && (
                <option value="">
                  {loading ? 'Загрузка…' : 'Профессий пока нет'}
                </option>
              )}
              {professions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <div className="w-[140px]">
            <span className="mb-1.5 block text-xs font-medium text-secondary">
              Уровень входа
            </span>
            <div className="flex h-11 items-center rounded-lg border border-border bg-page px-3 text-sm text-text">
              {profession?.entryLevel
                ? PROFESSION_LEVEL_LABELS[profession.entryLevel]
                : '—'}
            </div>
          </div>
          <div className="min-w-[220px] pb-0.5">
            <p className="text-sm font-semibold text-text">
              {profession
                ? `Рабочая версия ${profession.contentVersion}`
                : 'Нет данных'}
            </p>
            <p className="mt-0.5 text-xs text-secondary">
              {profession?.publishedAt
                ? `Последняя публикация: ${formatDate(profession.publishedAt)}${
                    profession.publishedByName
                      ? ` · ${profession.publishedByName}`
                      : ''
                  }`
                : 'Ещё не публиковалась'}
            </p>
          </div>
        </div>

        {!overview ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-sm text-secondary shadow-[var(--shadow-soft)]">
            {loading ? 'Загружаем сводку…' : 'Сводка недоступна.'}
          </div>
        ) : !profession ? (
          <div className="rounded-xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)]">
            <p className="text-base font-semibold text-text">
              Профессий пока нет
            </p>
            <p className="mt-1 max-w-xl text-sm text-secondary">
              Обзор показывает состояние контента выбранной профессии. Создайте
              первую профессию и навыки в редакторе графа — здесь появятся
              метрики и чек-лист публикации.
            </p>
            <div className="mt-4">
              <Link
                href="/admin/graph"
                className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:bg-[#4448C4]"
              >
                Перейти в редактор графа
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div
              className={cn(
                'mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4',
                refreshing && 'opacity-60'
              )}
            >
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)]"
                >
                  <p className="text-xs font-medium text-secondary">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-text">
                    {stat.value}
                  </p>
                  <p className={cn('mt-1 text-xs', TONE_CLASSES[stat.tone])}>
                    {stat.hint}
                  </p>
                </div>
              ))}
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
              <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-soft)]">
                <h2 className="text-base font-semibold text-text">
                  Проверка перед публикацией
                </h2>
                <p className="mt-1 text-sm text-secondary">
                  {allChecksPassed
                    ? 'Всё готово: структура и материалы проверены.'
                    : 'Проверьте материалы, которые увидят студенты.'}
                </p>

                <ul className="mt-5 space-y-4">
                  {checklist.map((item) => (
                    <ChecklistItem key={item.title} item={item} />
                  ))}
                </ul>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href="/admin/resources" className={secondaryLink}>
                    Проверить ресурсы
                  </Link>
                  {overview.checklist.brokenDependencies > 0 && (
                    <Link href="/admin/graph" className={secondaryLink}>
                      Разобрать связи
                    </Link>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-soft)]">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-text">
                    Версия {profession.contentVersion}
                  </h2>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-medium',
                      overview.hasUnpublishedChanges
                        ? 'bg-[#FFF8E8] text-warning'
                        : 'bg-success-soft text-success'
                    )}
                  >
                    {overview.hasUnpublishedChanges
                      ? 'Черновик'
                      : 'Опубликовано'}
                  </span>
                </div>
                <p className="mt-3 text-sm text-secondary">
                  {overview.hasUnpublishedChanges
                    ? 'Изменения пока видны только редакторам. После публикации они станут доступны студентам.'
                    : 'Студенты видят актуальную версию карты. Новые правки появятся здесь как черновик.'}
                </p>

                <div className="mt-5 space-y-2">
                  <Link
                    href="/admin/graph"
                    className={cn(secondaryLink, 'w-full')}
                  >
                    Предпросмотр карты
                  </Link>
                  <Button
                    className="w-full"
                    isLoading={publishing}
                    disabled={!overview.hasUnpublishedChanges}
                    onClick={handlePublish}
                  >
                    Опубликовать изменения
                  </Button>
                </div>
                <p className="mt-3 text-center text-xs text-secondary">
                  {profession.draftSavedAt
                    ? `Черновик сохранён ${formatDateTime(profession.draftSavedAt)}`
                    : 'Черновик ещё не сохранялся'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
              <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-soft)]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-text">
                    Последние изменения
                  </h2>
                  <Link
                    href="/admin/history"
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    Вся история
                  </Link>
                </div>

                {overview.recent.length === 0 ? (
                  <p className="text-sm text-secondary">
                    Изменений ещё не было — журнал заполнится после правок
                    контента.
                  </p>
                ) : (
                  <ul>
                    {overview.recent.map((event) => (
                      <RecentItem key={event.id} event={event} />
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-soft)]">
                <h2 className="text-base font-semibold text-text">
                  Продолжить работу
                </h2>

                <div className="mt-4 space-y-4">
                  <Link href="/admin/graph" className="group block">
                    <p className="text-sm font-semibold text-accent group-hover:underline">
                      Редактор графа →
                    </p>
                    <p className="mt-0.5 text-xs text-secondary">
                      {countLabel(overview.stats.skills, SKILL_FORMS)} ·{' '}
                      {countLabel(
                        overview.stats.dependencies,
                        DEPENDENCY_FORMS
                      )}
                    </p>
                  </Link>
                  <Link href="/admin/resources" className="group block">
                    <p className="text-sm font-semibold text-accent group-hover:underline">
                      Ресурсы и соответствия →
                    </p>
                    <p className="mt-0.5 text-xs text-secondary">
                      {countLabel(overview.stats.resources, RESOURCE_FORMS)}
                      {overview.stats.attention > 0
                        ? ` · ${overview.stats.attention} требуют внимания`
                        : ' · всё проверено'}
                    </p>
                  </Link>
                  <Link href="/admin/history" className="group block">
                    <p className="text-sm font-semibold text-accent group-hover:underline">
                      История изменений →
                    </p>
                    <p className="mt-0.5 text-xs text-secondary">
                      Кто и что менял в контенте профессии
                    </p>
                  </Link>
                </div>

                <div className="mt-6 rounded-lg border border-border bg-page p-3">
                  <p className="text-xs font-semibold text-text">
                    {overview.checklist.cycle.length > 0
                      ? 'Сначала разберите цикл зависимостей'
                      : overview.checklist.skillsWithoutResources > 0
                        ? 'Сначала добавьте материалы навыкам'
                        : 'Сначала проверьте черновики'}
                  </p>
                  <p className="mt-1 text-xs text-secondary">
                    {overview.checklist.cycle.length > 0
                      ? 'Пока в графе есть цикл, публикация заблокирована.'
                      : overview.checklist.skillsWithoutResources > 0
                        ? 'Навыки без ресурсов не попадут в план обучения.'
                        : 'Убедитесь, что новые навыки и материалы готовы к публикации.'}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
