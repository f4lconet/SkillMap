'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/shared/ui';
import { SiteHeader } from '@/widgets/site-header';
import {
  SkillMapCanvas,
  buildSkillGraph,
  nodeStatusColor,
} from '@/features/skill-map';
import { PublicSkillDetailPanel } from '@/features/public-map';
import { useSessionUser } from '@/features/auth';
import { professionApi, type Profession } from '@/entities/profession';
import { skillApi, type ProfessionMap } from '@/entities/skill';
import { pluralSkills } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';

/** Профессия, с которой открывается демо (если у неё есть граф навыков). */
const DEFAULT_SLUG = 'data-scientist';

const LOAD_ERROR =
  'Не удалось загрузить демо-карту. Проверьте соединение и попробуйте снова.';

type MapState = { professionId: string; map: ProfessionMap };

export function DemoMapPage() {
  const { user } = useSessionUser();
  const [professions, setProfessions] = useState<Profession[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mapState, setMapState] = useState<MapState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Демо показывает только профессии с наполненным графом навыков.
  useEffect(() => {
    let cancelled = false;
    professionApi
      .list()
      .then((items) => {
        if (cancelled) return;
        const ready = items.filter((profession) => profession.skillsReady);
        setProfessions(ready);
        setActiveId((current) => {
          if (current && ready.some((profession) => profession.id === current)) {
            return current;
          }
          const preferred =
            ready.find((profession) => profession.slug === DEFAULT_SLUG) ??
            ready[0];
          return preferred?.id ?? null;
        });
        if (ready.length === 0) {
          setError('В каталоге пока нет профессий с готовой картой навыков.');
        }
      })
      .catch(() => {
        if (!cancelled) setError(LOAD_ERROR);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    skillApi
      .getProfessionMap(activeId)
      .then((map) => {
        if (!cancelled) setMapState({ professionId: activeId, map });
      })
      .catch(() => {
        if (!cancelled) setError(LOAD_ERROR);
      });
    return () => {
      cancelled = true;
    };
  }, [activeId, reloadKey]);

  const retry = useCallback(() => {
    setError(null);
    setReloadKey((key) => key + 1);
  }, []);

  const selectProfession = useCallback((professionId: string) => {
    setSelectedId(null);
    setActiveId(professionId);
  }, []);

  const map = mapState?.professionId === activeId ? mapState.map : null;
  const graph = useMemo(() => buildSkillGraph(map), [map]);

  const selectedData = useMemo(
    () => graph.nodes.find((node) => node.id === selectedId)?.data ?? null,
    [graph.nodes, selectedId]
  );

  const activeProfession = useMemo(
    () => professions?.find((profession) => profession.id === activeId) ?? null,
    [professions, activeId]
  );

  const loading = map === null && error === null;

  return (
    <div className="min-h-screen bg-page text-text">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="rounded-full bg-accent-soft px-2.5 py-1 text-helper font-medium text-accent">
              Демо · без регистрации
            </span>
            <h1 className="mt-3 text-h2 tracking-tight text-text">
              Так выглядит карта навыков
            </h1>
            <p className="mt-2 max-w-2xl text-body leading-relaxed text-secondary">
              Настоящая карта из каталога: навыки, зависимости и порядок
              изучения. Выберите навык на графе — справа появятся описание,
              предпосылки и то, что он открывает.
            </p>
          </div>
          <Link href="/catalog">
            <Button variant="primary">Выбрать профессию</Button>
          </Link>
        </div>

        {professions && professions.length > 1 && (
          <div
            className="mt-6 flex flex-wrap gap-2"
            role="group"
            aria-label="Профессии демо-карты"
          >
            {professions.map((profession) => {
              const active = profession.id === activeId;
              return (
                <button
                  key={profession.id}
                  type="button"
                  onClick={() => selectProfession(profession.id)}
                  aria-pressed={active}
                  className={cn(
                    'cursor-pointer rounded-full border px-3.5 py-1.5 text-helper font-medium transition-colors',
                    active
                      ? 'border-accent bg-accent text-white'
                      : 'border-border bg-surface text-secondary hover:border-accent/40 hover:text-text'
                  )}
                >
                  {profession.title}
                </button>
              );
            })}
          </div>
        )}

        {error ? (
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6 text-center shadow-soft">
            <p className="text-section text-text">Демо-карта недоступна</p>
            <p className="mt-2 text-body text-secondary">{error}</p>
            <div className="mt-4 flex justify-center gap-3">
              <Button variant="secondary" onClick={retry}>
                Повторить
              </Button>
              <Link href="/catalog">
                <Button variant="primary">Перейти в каталог</Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <section className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-5 py-4 shadow-soft">
              <div>
                <p className="text-section font-semibold text-text">
                  {map?.professionTitle ?? 'Загружаем профессию…'}
                </p>
                <p className="mt-1 text-helper text-secondary">
                  {map
                    ? `${map.totalSkills} ${pluralSkills(map.totalSkills)} · ${activeProfession?.direction ?? 'Каталог профессий'}`
                    : 'Загружаем данные карты…'}
                </p>
              </div>
              <span className="rounded-full bg-page px-2.5 py-1 text-helper font-medium text-secondary">
                Только просмотр
              </span>
            </section>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_280px]">
              <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3.5">
                  <p className="text-body font-medium text-text">
                    Основной трек · {graph.nodes.length}{' '}
                    {pluralSkills(graph.nodes.length)}
                  </p>
                  <span className="rounded-full bg-page px-2.5 py-1 text-helper font-medium text-secondary">
                    {loading ? 'Загрузка…' : 'Масштаб и перетаскивание'}
                  </span>
                </div>

                <div className="p-3 sm:p-4">
                  {loading ? (
                    <div className="flex h-[440px] w-full items-center justify-center rounded-xl border border-dashed border-border bg-[#F8F9FC] text-helper text-secondary">
                      Загружаем демо-карту…
                    </div>
                  ) : (
                    <SkillMapCanvas
                      nodes={graph.nodes}
                      edges={graph.edges}
                      filter="all"
                      search=""
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                      readOnly
                      className="h-[440px] w-full rounded-xl"
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 border-t border-border px-5 py-3 text-helper text-secondary">
                  <LegendDot color={nodeStatusColor.mastered} label="Освоен" />
                  <LegendDot
                    color={nodeStatusColor['in-progress']}
                    label="В процессе"
                  />
                  <LegendDot
                    color={nodeStatusColor.available}
                    label="Можно начать"
                  />
                  <LegendDot color={nodeStatusColor.locked} label="Недоступен" />
                </div>
              </section>

              <div className="lg:sticky lg:top-6 lg:self-start">
                <PublicSkillDetailPanel
                  data={selectedData}
                  note="Демо-режим: отметки навыков не сохраняются."
                />
              </div>
            </div>

            <p className="mt-3 text-helper leading-relaxed text-secondary">
              {user
                ? `Вы вошли как ${user.name}: на демо-карте показаны ваши текущие отметки по этой профессии. Гость увидел бы все навыки доступными для просмотра.`
                : 'Гость видит все навыки доступными для просмотра, поэтому граф окрашен одним цветом. В личной карте статусы считаются по вашим отметкам: освоенные навыки открывают следующие, а зависимые остаются недоступными.'}
            </p>

            <section className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#182137] px-6 py-5 text-white">
              <div>
                <p className="text-section font-semibold text-white">
                  Это демо — ваша карта будет с вашим прогрессом.
                </p>
                <p className="mt-1 text-body text-white/70">
                  Выберите цель, отметьте известные навыки и получите план по
                  неделям с ресурсами.
                </p>
              </div>
              <Link href="/onboarding">
                <Button
                  variant="primary"
                  className="shrink-0 bg-accent hover:bg-[#4448C4]"
                >
                  → Создать свою карту
                </Button>
              </Link>
            </section>
          </>
        )}
      </main>
    </div>
  );
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
