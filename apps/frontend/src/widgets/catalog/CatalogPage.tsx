'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  professionApi,
  LEVEL_LABELS,
  type Profession,
  type ProfessionLevel,
} from '@/entities/profession';
import { Button } from '@/shared/ui';
import { CatalogProfessionCard } from '@/features/catalog/ui/CatalogProfessionCard';
import { cn } from '@/shared/lib/cn';
import { authApi } from '@/features/auth';

export function CatalogPage() {
  const [list, setList] = useState<Profession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [direction, setDirection] = useState<string | 'all'>('all');
  const [level, setLevel] = useState<ProfessionLevel | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [directions, setDirections] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({ all: 0 });
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const requestKey = `${search}|${direction}|${level}`;
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    let cancelled = false;
    professionApi
      .list({ search, direction, level })
      .then((data) => {
        if (cancelled) return;
        setList(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setList([]);
        setError(err instanceof Error ? err.message : 'Не удалось загрузить профессии');
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(requestKey);
      });
    return () => {
      cancelled = true;
    };
  }, [search, direction, level, requestKey]);

  // Справочник направлений и счётчики — из бэкенда
  useEffect(() => {
    let cancelled = false;
    Promise.all([professionApi.getDirections(), professionApi.getDirectionCounts()])
      .then(([items, nextCounts]) => {
        if (cancelled) return;
        setDirections(items);
        setCounts(nextCounts);
      })
      .catch(() => {
        /* чипы просто не покажутся */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Восстанавливаем цель из профиля пользователя
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      const user = authApi.getCurrentUser();
      if (!cancelled && user?.targetProfession?.id) {
        setSelectedId(user.targetProfession.id);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    if (authApi.getAccessToken()) {
      authApi.setTargetProfession(id).catch(() => {
        /* цель сохранится локально, повторим при следующем выборе */
      });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleReset = () => {
    setSearch('');
    setSearchInput('');
    setDirection('all');
    setLevel('all');
  };

  return (
    <div className="min-h-screen bg-page">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
              S
            </span>
            <span className="text-lg font-semibold text-text">SkillMap</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-secondary md:flex">
            <Link href="/#how" className="hover:text-text">
              Как это работает
            </Link>
            <Link href="/catalog" className="text-accent">
              Каталог профессий
            </Link>
            <Link href="/demo" className="hover:text-text">
              Демо-карта
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/auth"
              className="hidden text-sm font-medium text-secondary hover:text-text sm:block"
            >
              Войти
            </Link>
            <Link href="/auth">
              <Button variant="primary" size="sm" className="h-9 px-4">
                Начать бесплатно
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <h1 className="text-h2 tracking-tight text-text sm:text-[36px]">
          Кем вы хотите стать?
        </h1>
        <p className="mt-2 text-body text-secondary">
          {counts.all > 0 ? `${counts.all} профессий` : 'Профессии'}, понятные требования
          и карта навыков для каждой цели.
        </p>

        {/* Filters */}
        <form
          onSubmit={handleSearchSubmit}
          className="mt-8 grid gap-3 sm:grid-cols-[1fr_180px_140px_auto] sm:items-end"
        >
          <div>
            <label className="mb-1.5 block text-label text-text">Поиск профессии</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
              </span>
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Введите название или навык"
                className="h-12 w-full rounded-md border border-border bg-surface pl-10 pr-4 text-body text-text outline-none placeholder:text-secondary focus:border-accent focus:ring-[3px] focus:ring-[rgba(83,87,217,0.33)]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-label text-text">Направление</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              className="h-12 w-full appearance-none rounded-md border border-border bg-surface px-4 text-body text-text outline-none focus:border-accent focus:ring-[3px] focus:ring-[rgba(83,87,217,0.33)]"
            >
              <option value="all">Все направления</option>
              {directions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-label text-text">Целевой уровень</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as ProfessionLevel | 'all')}
              className="h-12 w-full appearance-none rounded-md border border-border bg-surface px-4 text-body text-text outline-none focus:border-accent focus:ring-[3px] focus:ring-[rgba(83,87,217,0.33)]"
            >
              <option value="all">Любой</option>
              {(Object.keys(LEVEL_LABELS) as ProfessionLevel[]).map((key) => (
                <option key={key} value={key}>
                  {LEVEL_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          <Button type="button" variant="secondary" className="h-12" onClick={handleReset}>
            Сбросить
          </Button>
        </form>

        {/* Direction chips */}
        <div className="mt-5 flex flex-wrap gap-2">
          {[{ key: 'all', label: 'Все профессии' }, ...directions.map((name) => ({ key: name, label: name }))].map(
            (chip) => {
              const count = counts[chip.key] ?? 0;
              const active = direction === chip.key;
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setDirection(chip.key)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-helper font-medium transition-colors',
                    active
                      ? 'bg-accent-soft text-accent'
                      : 'bg-surface text-secondary hover:bg-page'
                  )}
                >
                  {chip.label} · {count}
                </button>
              );
            }
          )}
        </div>

        {/* Grid */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-52 animate-pulse rounded-2xl border border-border bg-surface"
              />
            ))}
          {!loading && error && (
            <div className="col-span-full rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-body text-danger">
              {error}
            </div>
          )}
          {!loading && !error && list.length === 0 && (
            <p className="col-span-full py-12 text-center text-body text-secondary">
              Ничего не найдено. Попробуйте сбросить фильтры.
            </p>
          )}
          {!loading &&
            list.map((p) => (
              <CatalogProfessionCard
                key={p.id}
                profession={p}
                selected={selectedId === p.id}
                onSelect={handleSelect}
              />
            ))}
        </div>

        {/* Tip */}
        <div className="mt-10 rounded-2xl border border-accent/15 bg-accent-soft/40 px-5 py-4 text-body text-secondary">
          <span className="mr-2 text-accent">ℹ</span>
          Не уверены в выборе? Откройте демо-карту профессии — посмотрите навыки и
          ресурсы до регистрации.
        </div>
      </main>
    </div>
  );
}
