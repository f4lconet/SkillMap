'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AppShell } from '@/widgets/app-shell';
import { Button, Progress, ShareIcon } from '@/shared/ui';
import {
  SkillMapCanvas,
  SkillDetailPanel,
  useSkillMapData,
  type SkillFilter,
} from '@/features/skill-map';
import { USER_LEVEL_LABELS, USER_ROLE_LABELS } from '@/entities/user';
import { cn } from '@/shared/lib/cn';

const chips: { key: SkillFilter; label: string }[] = [
  { key: 'all', label: 'Все навыки' },
  { key: 'mastered', label: 'Освоено' },
  { key: 'in-progress', label: 'В процессе' },
  { key: 'ahead', label: 'Предстоит' },
];

export function SkillMapPage() {
  const {
    user,
    map,
    gap,
    trajectory,
    graph,
    loading,
    error,
    savingId,
    canUndo,
    canRedo,
    reload,
    markSkill,
    moveNodes,
    undo,
    redo,
  } = useSkillMapData();

  const [filter, setFilter] = useState<SkillFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shareHint, setShareHint] = useState(false);

  const levelLabel = user?.level ? USER_LEVEL_LABELS[user.level] : null;

  const counts = useMemo(() => {
    const c: Record<SkillFilter, number> = {
      all: graph.nodes.length,
      mastered: 0,
      'in-progress': 0,
      available: 0,
      locked: 0,
      ahead: 0,
    };
    for (const node of graph.nodes) {
      c[node.data.status] += 1;
    }
    c.ahead = c.available + c.locked;
    return c;
  }, [graph.nodes]);

  const total = map?.totalSkills ?? graph.nodes.length;
  const mastered = map?.masteredCount ?? counts.mastered;
  const percent = map ? Math.round(map.progressPercent) : 0;
  const selectedNode = graph.nodes.find((node) => node.id === selectedId);

  const header = (content: ReactNode) => (
    <AppShell
      breadcrumb={['Моё обучение', 'Карта']}
      userName={user?.name}
      userRole={user ? USER_ROLE_LABELS[user.role] : undefined}
      goalTitle={user?.targetProfession?.title}
      goalProgress={percent}
      userLevel={levelLabel ?? undefined}
    >
      {content}
    </AppShell>
  );

  if (loading) {
    return header(
      <div className="flex h-[60vh] items-center justify-center text-body text-secondary">
        Загружаем карту навыков…
      </div>
    );
  }

  if (error && !map) {
    return header(
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-body text-secondary">{error}</p>
        <Button variant="primary" className="mt-4" onClick={() => void reload()}>
          Повторить
        </Button>
      </div>
    );
  }

  if (!user?.targetProfession) {
    return header(
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-h3 text-text">Цель пока не выбрана</p>
        <p className="mt-2 text-body text-secondary">
          Выберите профессию — и мы построим карту навыков с зависимостями.
        </p>
        <Link href="/catalog" className="mt-4 inline-block">
          <Button variant="primary">Выбрать профессию</Button>
        </Link>
      </div>
    );
  }

  if (!map || !map.skillsReady || map.skills.length === 0) {
    return header(
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-h3 text-text">Карта для этой профессии ещё готовится</p>
        <p className="mt-2 text-body text-secondary">
          Навыки и связи для «{user.targetProfession.title}» пока не заполнены
          редактором.
        </p>
        <Link href="/catalog" className="mt-4 inline-block">
          <Button variant="secondary">Выбрать другую профессию</Button>
        </Link>
      </div>
    );
  }

  return header(
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
            Ваша цель{levelLabel ? ` · ${levelLabel}` : ''}
          </p>
          <h1 className="mt-1 text-h2 tracking-tight text-text">
            {map.professionTitle}
          </h1>
          <p className="mt-1 text-body text-secondary">
            Здесь видно, что вы уже умеете и какой навык откроет следующий шаг
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savingId && (
            <span className="text-helper text-secondary">Сохраняем…</span>
          )}
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ShareIcon />}
            onClick={() => setShareHint((v) => !v)}
            title="Скоро"
          >
            Поделиться картой
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-warning/40 bg-[#FFF8E8] px-4 py-2.5 text-helper text-warning">
          {error}
        </div>
      )}

      {shareHint && (
        <div className="mt-4 rounded-xl border border-border bg-surface px-4 py-2.5 text-helper text-secondary">
          Публичные ссылки на карту скоро появятся — раздел в разработке.
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 flex flex-wrap items-center gap-6 rounded-2xl border border-border bg-surface px-5 py-4">
        <div className="min-w-[180px] flex-1">
          <div className="mb-1.5 flex items-center justify-between text-helper">
            <span className="text-secondary">
              {mastered} из {total} навыков освоено
            </span>
            <span className="font-semibold text-text">{percent}%</span>
          </div>
          <Progress value={percent} showValue={false} />
        </div>
        <div>
          <p className="text-2xl font-bold text-text">
            {gap?.estimatedRemainingHours ?? '—'} ч
          </p>
          <p className="text-helper text-secondary">
            {trajectory
              ? `до цели · около ${trajectory.totalWeeks} недель`
              : 'оценка оставшегося времени'}
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold text-text">
            {user.hoursPerWeek ?? trajectory?.hoursPerWeek ?? '—'} ч / нед.
          </p>
          <p className="text-helper text-secondary">Ваш комфортный темп</p>
        </div>
        <Link href="/trajectory">
          <Button variant="primary">→ Открыть план</Button>
        </Link>
      </div>

      {/* Filters + search */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilter(chip.key)}
              className={cn(
                'cursor-pointer rounded-full px-3 py-1.5 text-helper font-medium transition-colors',
                filter === chip.key
                  ? 'bg-accent-soft text-accent hover:bg-[#E3E1FB]'
                  : 'bg-surface text-secondary hover:bg-page hover:text-text'
              )}
            >
              {chip.label} · {counts[chip.key]}
            </button>
          ))}
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Найти навык"
            className="h-9 w-48 rounded-lg border border-border bg-surface pl-8 pr-3 text-helper outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Graph + panel */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-helper text-secondary">
              Основной трек · {mastered} из {total} навыков
            </p>
            <span className="rounded-full bg-page px-2.5 py-1 text-helper text-secondary">
              {graph.edges.length} связей
            </span>
          </div>

          <SkillMapCanvas
            nodes={graph.nodes}
            edges={graph.edges}
            filter={filter}
            search={search}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={moveNodes}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={() => void undo()}
            onRedo={() => void redo()}
          />

          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center gap-4 px-1 text-helper text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success" /> Освоен
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent" /> В процессе
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-warning" /> Можно начать
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#C5CBD6]" /> Недоступен
            </span>
          </div>
          <p className="mt-2 px-1 text-helper text-secondary">
            ▹ Выберите узел, чтобы увидеть детали. Стрелка ведёт от основы к
            зависимому навыку, пунктир — рекомендованная связь, а цвет связи
            совпадает со статусом навыка, к которому она ведёт.
          </p>
        </div>

        {selectedNode ? (
          <SkillDetailPanel
            key={selectedNode.id}
            data={selectedNode.data}
            saving={savingId === selectedNode.id}
            onClose={() => setSelectedId(null)}
            onSetStatus={(status) => void markSkill(selectedNode.id, status)}
          />
        ) : (
          <div className="flex h-fit items-center justify-center rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-helper text-secondary lg:min-h-[320px]">
            Выберите навык на карте
          </div>
        )}
      </div>
    </div>
  );
}
