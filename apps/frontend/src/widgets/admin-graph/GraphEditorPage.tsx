'use client';

import { useMemo, useState } from 'react';
import { AdminShell } from '@/widgets/admin-shell';
import { Button, Input, Select } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useSessionUser } from '@/features/auth';
import {
  AddDependencyForm,
  AdminGraphCanvas,
  GraphPreviewModal,
  ProfessionEditorCard,
  SkillEditorPanel,
  SkillEdgesTable,
  useAdminGraph,
} from '@/features/admin-graph';
import {
  formatDateTime,
  PROFESSION_LEVEL_OPTIONS,
  toSlug,
  type AdminProfessionUpdate,
  type AdminSkillPatch,
  type DependencyType,
  type ProfessionLevel,
} from '@/entities/admin-graph';

type ProfessionDraft = {
  title: string;
  direction: string;
  entryLevel: ProfessionLevel;
};

const EMPTY_DRAFT: ProfessionDraft = {
  title: '',
  direction: '',
  entryLevel: 'beginner',
};

const LEVEL_OPTIONS = PROFESSION_LEVEL_OPTIONS;

export function GraphEditorPage() {
  const {
    professions,
    professionId,
    graph,
    loading,
    graphLoading,
    error,
    busy,
    toast,
    validation,
    preview,
    previewOpen,
    selectProfession,
    reload,
    addSkill,
    saveSkill,
    deleteSkill,
    moveNode,
    addDependency,
    changeDependencyType,
    removeDependency,
    publish,
    resetLayout,
    validate,
    updateProfession,
    createProfession,
    deleteProfession,
    openPreview,
    closePreview,
    dismissToast,
  } = useAdminGraph();

  const { user } = useSessionUser();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addingDependency, setAddingDependency] = useState(false);
  const [creatingProfession, setCreatingProfession] = useState(false);
  const [newProfession, setNewProfession] = useState<ProfessionDraft>(EMPTY_DRAFT);

  const profession = useMemo(
    () => professions.find((item) => item.id === professionId) ?? null,
    [professions, professionId]
  );

  const handleSelectProfession = (id: string) => {
    setSelectedId(null);
    setAddingDependency(false);
    selectProfession(id);
  };

  const professionOptions = useMemo(
    () =>
      professions.map((item) => ({
        value: item.id,
        label: `${item.title} · ${
          item.status === 'published' ? 'опубликована' : 'черновик'
        }`,
      })),
    [professions]
  );

  const selectedNode = useMemo(
    () => graph?.nodes.find((node) => node.id === selectedId) ?? null,
    [graph, selectedId]
  );

  const prerequisiteIds = useMemo(
    () =>
      graph && selectedId
        ? graph.edges
            .filter((edge) => edge.skillId === selectedId)
            .map((edge) => edge.prerequisiteId)
        : [],
    [graph, selectedId]
  );

  const handleAddSkill = () => {
    void addSkill().then((id) => {
      if (id) setSelectedId(id);
    });
  };

  const handleSaveSkill = (patch: AdminSkillPatch, ids: string[]) => {
    if (!selectedId) return;
    void saveSkill(selectedId, patch, ids);
  };

  const handleDeleteSkill = () => {
    if (!selectedId) return;
    if (!window.confirm('Удалить навык вместе со всеми его связями?')) return;
    void deleteSkill(selectedId).then((ok) => {
      if (ok) setSelectedId(null);
    });
  };

  const handleAddDependency = (
    skillId: string,
    prerequisiteId: string,
    depType: DependencyType
  ) => {
    void addDependency(skillId, prerequisiteId, depType).then((ok) => {
      if (!ok) return;
      setAddingDependency(false);
      setSelectedId(skillId);
    });
  };

  const handleSaveProfession = (patch: AdminProfessionUpdate) => {
    void updateProfession(patch);
  };

  const handleDeleteProfession = () => {
    if (!profession) return;
    if (
      !window.confirm(
        `Удалить профессию «${profession.title}»? Действие необратимо.`
      )
    ) {
      return;
    }
    void deleteProfession();
  };

  const handleCreateProfession = () => {
    const title = newProfession.title.trim();
    if (!title) return;
    void createProfession({
      slug: toSlug(title),
      title,
      direction: newProfession.direction.trim(),
      entryLevel: newProfession.entryLevel,
    }).then((ok) => {
      if (!ok) return;
      setCreatingProfession(false);
      setNewProfession(EMPTY_DRAFT);
    });
  };

  const relationshipCount = graph
    ? graph.stats.required + graph.stats.recommended
    : 0;

  const saveStatus = graph
    ? `Данные на ${formatDateTime(graph.updatedAt)}`
    : undefined;

  const publication = graph
    ? {
        title: `${graph.title} · версия ${graph.contentVersion}`,
        badge: graph.hasUnpublishedChanges
          ? 'Есть неопубликованные изменения'
          : 'Изменения опубликованы',
        tone: (graph.hasUnpublishedChanges ? 'warning' : 'success') as
          | 'warning'
          | 'success',
      }
    : null;

  return (
    <AdminShell
      breadcrumb={['Редакторская', 'Граф']}
      saveStatus={saveStatus}
      onReload={() => void reload()}
      publication={publication}
      user={
        user
          ? {
              name: user.name,
              role: user.role === 'student' ? 'Студент' : 'Редактор',
            }
          : null
      }
    >
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {toast && (
          <button
            type="button"
            onClick={dismissToast}
            className={cn(
              'mb-4 block w-full rounded-xl border px-4 py-2.5 text-left text-helper font-medium',
              toast.tone === 'success'
                ? 'border-success/20 bg-success-soft text-success'
                : 'border-danger/20 bg-danger-soft text-danger'
            )}
          >
            {toast.message}
          </button>
        )}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              Редакторская · Контент профессии
            </p>
            <h1 className="mt-1 text-h2 tracking-tight text-text">Редактор графа</h1>
            <p className="mt-1 text-body text-secondary">
              Управляйте навыками, зависимостями и структурой профессиональных карт.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              isLoading={busy === 'preview'}
              disabled={!graph}
              onClick={() => void openPreview()}
            >
              ◎ Предпросмотр
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={busy === 'publish'}
              disabled={!graph}
              onClick={() => void publish()}
            >
              ⇧ Опубликовать
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Chip>Профессии · {professions.length}</Chip>
          <Chip>Навыки · {graph?.stats.skills ?? 0}</Chip>
          <Chip>Связи · {relationshipCount}</Chip>
          <Chip>Слои · {graph?.stats.layers ?? 0}</Chip>
          <Chip>Ресурсы · {graph?.stats.resources ?? 0}</Chip>
          {graph && (
            <Chip tone={graph.hasUnpublishedChanges ? 'warn' : 'default'}>
              Версия · {graph.contentVersion}
              {graph.hasUnpublishedChanges ? ' · есть черновик' : ''}
            </Chip>
          )}
        </div>

        {loading && (
          <p className="mt-6 rounded-2xl border border-border bg-surface px-5 py-4 text-body text-secondary shadow-soft">
            Загружаем список профессий…
          </p>
        )}

        {error && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-danger/20 bg-danger-soft px-5 py-4 text-helper text-danger">
            <span>{error}</span>
            <Button variant="secondary" size="sm" onClick={() => void reload()}>
              Повторить
            </Button>
          </div>
        )}

        {!loading && professions.length === 0 && (
          <section className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-soft">
            <h2 className="text-section text-text">Профессий пока нет</h2>
            <p className="mt-1 text-body text-secondary">
              Создайте первую профессию, чтобы начать наполнять граф навыков.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Input
                label="Название"
                placeholder="Frontend-разработчик"
                value={newProfession.title}
                onChange={(e) =>
                  setNewProfession((prev) => ({ ...prev, title: e.target.value }))
                }
              />
              <Input
                label="Направление"
                placeholder="Разработка"
                value={newProfession.direction}
                onChange={(e) =>
                  setNewProfession((prev) => ({
                    ...prev,
                    direction: e.target.value,
                  }))
                }
              />
              <Select
                label="Уровень входа"
                options={LEVEL_OPTIONS}
                value={newProfession.entryLevel}
                onChange={(e) =>
                  setNewProfession((prev) => ({
                    ...prev,
                    entryLevel: e.target.value as ProfessionLevel,
                  }))
                }
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              className="mt-4"
              isLoading={busy === 'profession'}
              disabled={!newProfession.title.trim()}
              onClick={handleCreateProfession}
            >
              Создать профессию
            </Button>
          </section>
        )}

        {professions.length > 0 && (
          <section className="mt-5 rounded-2xl border border-border bg-surface p-5 shadow-soft">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <Select
                label="Профессия"
                options={professionOptions}
                value={professionId ?? ''}
                onChange={(e) => handleSelectProfession(e.target.value)}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCreatingProfession((prev) => !prev)}
              >
                {creatingProfession ? 'Отмена' : '+ Новая профессия'}
              </Button>
            </div>

            {creatingProfession && (
              <div className="mt-4 rounded-xl border border-dashed border-border bg-page/60 p-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <Input
                    label="Название"
                    placeholder="Frontend-разработчик"
                    value={newProfession.title}
                    onChange={(e) =>
                      setNewProfession((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Направление"
                    placeholder="Разработка"
                    value={newProfession.direction}
                    onChange={(e) =>
                      setNewProfession((prev) => ({
                        ...prev,
                        direction: e.target.value,
                      }))
                    }
                  />
                  <Select
                    label="Уровень входа"
                    options={LEVEL_OPTIONS}
                    value={newProfession.entryLevel}
                    onChange={(e) =>
                      setNewProfession((prev) => ({
                        ...prev,
                        entryLevel: e.target.value as ProfessionLevel,
                      }))
                    }
                  />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-3"
                  isLoading={busy === 'profession'}
                  disabled={!newProfession.title.trim()}
                  onClick={handleCreateProfession}
                >
                  Создать
                </Button>
              </div>
            )}
          </section>
        )}

        {profession && (
          <ProfessionEditorCard
            key={profession.id}
            profession={profession}
            skillsReady={graph?.skillsReady ?? false}
            busy={busy === 'profession'}
            onSave={handleSaveProfession}
            onDelete={handleDeleteProfession}
          />
        )}

        {graph && (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={busy === 'create-skill'}
                  onClick={handleAddSkill}
                >
                  + Добавить навык
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAddingDependency((prev) => !prev)}
                >
                  ↗ Добавить связь
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={busy === 'validate'}
                  onClick={() => void validate()}
                >
                  ✓ Проверить связи
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={busy === 'layout'}
                  onClick={() => void resetLayout()}
                >
                  ⟲ Сбросить раскладку
                </Button>
              </div>
              {validation ? (
                <p
                  className={cn(
                    'text-helper font-medium',
                    validation.ok ? 'text-success' : 'text-danger'
                  )}
                >
                  {validation.ok ? '✓' : '⚠'} {validation.message}
                </p>
              ) : (
                <p className="text-helper text-secondary">
                  Изменения сохраняются автоматически, публикация — отдельно.
                </p>
              )}
            </div>

            {addingDependency && (
              <div className="mt-4">
                <AddDependencyForm
                  nodes={graph.nodes}
                  defaultSkillId={selectedId}
                  busy={busy === 'dependency'}
                  onCancel={() => setAddingDependency(false)}
                  onSubmit={handleAddDependency}
                />
              </div>
            )}

            <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_280px]">
              <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3.5">
                  <p className="text-body font-medium text-text">
                    {graph.title} · {graph.stats.skills} навыков, {relationshipCount}{' '}
                    связей
                  </p>
                  <span className="rounded-full bg-page px-2.5 py-1 text-helper font-medium text-secondary">
                    {graphLoading ? 'Обновляем…' : 'Редактирование'}
                  </span>
                </div>
                <div className="p-3 sm:p-4">
                  <AdminGraphCanvas
                    nodes={graph.nodes}
                    edges={graph.edges}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onNodeMove={(id, x, y) => void moveNode(id, x, y)}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-4 border-t border-border px-5 py-3 text-helper text-secondary">
                  <LegendDot className="bg-success" label="Опубликован" />
                  <LegendDot className="bg-accent" label="Есть изменения" />
                  <LegendDot className="bg-warning" label="Новый" />
                  <LegendDot className="bg-[#C5CBD6]" label="Черновик" />
                </div>
              </section>

              <div className="lg:sticky lg:top-6 lg:self-start">
                <SkillEditorPanel
                  key={selectedNode?.id ?? 'empty'}
                  skill={selectedNode}
                  nodes={graph.nodes}
                  prerequisiteIds={prerequisiteIds}
                  saving={busy === 'save-skill' || busy === 'delete-skill'}
                  onSave={handleSaveSkill}
                  onDelete={handleDeleteSkill}
                />
              </div>
            </div>

            <div className="mt-5">
              <SkillEdgesTable
                skillId={selectedId}
                nodes={graph.nodes}
                edges={graph.edges}
                busy={busy === 'dependency'}
                onChangeType={(id, type) =>
                  void changeDependencyType(id, type)
                }
                onRemove={(id) => void removeDependency(id)}
              />
            </div>

            <div className="mt-5 rounded-2xl border border-accent/15 bg-accent-soft/50 px-4 py-3 text-helper leading-relaxed text-secondary">
              <span className="mr-1.5 text-accent">ℹ</span>
              Черновик виден только редакторам. Последняя публикация:{' '}
              {formatDateTime(graph.publishedAt)}
              {graph.publishedByName ? `, ${graph.publishedByName}` : ''}. После
              публикации карта станет доступна студентам.
            </div>
          </>
        )}

        {!loading && !error && professions.length > 0 && !graph && (
          <p className="mt-6 rounded-2xl border border-border bg-surface px-5 py-4 text-body text-secondary shadow-soft">
            Выберите профессию, чтобы открыть её граф.
          </p>
        )}
      </div>

      <GraphPreviewModal
        preview={preview}
        open={previewOpen}
        onClose={closePreview}
      />
    </AdminShell>
  );
}

function Chip({
  children,
  tone = 'default',
}: {
  children: React.ReactNode;
  tone?: 'default' | 'warn';
}) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-helper font-medium',
        tone === 'warn'
          ? 'bg-[#FFF8E8] text-warning'
          : 'bg-page text-secondary'
      )}
    >
      {children}
    </span>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-2 w-2 rounded-full', className)} />
      {label}
    </span>
  );
}
