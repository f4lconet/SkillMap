'use client';

import { useMemo } from 'react';
import { AdminShell } from '@/widgets/admin-shell';
import { Button } from '@/shared/ui/button/Button';
import { cn } from '@/shared/lib/cn';
import { useSessionUser } from '@/features/auth';
import { useAdminResources } from '@/features/admin-resources';
import { ResourcesHeader } from './resources-header';
import { ResourcesStats } from './resources-stats';
import { ResourcesFilters } from './resources-filters';
import { ResourcesTable } from './resources-table';
import { ResourceSidebar } from './resource-sidebar';
import { CorrespondencesTable } from './correspondences-table';

export function ResourcesEditorPage() {
  const {
    professions,
    skills,
    items,
    total,
    stats,
    filters,
    offset,
    limit,
    listLoading,
    error,
    busy,
    toast,
    selectedId,
    draft,
    isNew,
    skillResources,
    skillResourcesLoading,
    setFilter,
    setOffset,
    resetFilters,
    selectResource,
    startCreate,
    cancelDraft,
    changeDraft,
    save,
    remove,
    publish,
    checkLink,
    checkLinks,
    reload,
    dismissToast,
  } = useAdminResources();

  const { user } = useSessionUser();

  const professionTitle = useMemo(
    () =>
      professions.find((item) => item.id === filters.professionId)?.title ??
      null,
    [filters.professionId, professions]
  );

  const skillTitle = useMemo(
    () => skills.find((item) => item.id === draft?.skillId)?.title ?? null,
    [draft?.skillId, skills]
  );

  const selected = useMemo(
    () =>
      items.find((item) => item.id === selectedId) ??
      skillResources.find((item) => item.id === selectedId) ??
      null,
    [items, selectedId, skillResources]
  );

  const publication = stats
    ? {
        title: 'База знаний',
        badge: `${stats.published} опубликовано · ${stats.needsReview} на проверке`,
        tone: (stats.draft + stats.needsReview > 0 ? 'warning' : 'success') as
          | 'warning'
          | 'success',
      }
    : null;

  const handleDelete = () => {
    if (!selectedId) return;
    if (window.confirm('Удалить ресурс? Действие необратимо.')) {
      void remove(selectedId);
    }
  };

  const handleBulkPublish = async () => {
    const pending = skillResources.filter(
      (resource) => resource.status !== 'published'
    );
    for (const resource of pending) {
      const ok = await publish(resource.id);
      if (!ok) break;
    }
  };

  return (
    <AdminShell
      breadcrumb={['Редакторская', 'Ресурсы']}
      saveStatus={
        draft && !isNew ? 'Правки сохраняются на сервере' : undefined
      }
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

        {error && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/20 bg-danger-soft px-4 py-2.5 text-helper text-danger">
            <span>{error}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void reload()}
            >
              Повторить
            </Button>
          </div>
        )}

        <ResourcesHeader onCreate={startCreate} creating={isNew} />

        <div className="mb-6">
          <ResourcesStats
            stats={stats}
            professionTitle={professionTitle}
            loading={listLoading}
          />
        </div>

        <div className="mb-6">
          <ResourcesFilters
            filters={filters}
            professions={professions}
            busy={busy !== null}
            onChange={setFilter}
            onReset={resetFilters}
            onBulkCheck={() => void checkLinks()}
          />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
          <ResourcesTable
            items={items}
            total={total}
            offset={offset}
            limit={limit}
            loading={listLoading}
            selectedId={selectedId}
            onSelect={selectResource}
            onPage={setOffset}
          />
          <ResourceSidebar
            draft={draft}
            isNew={isNew}
            busy={busy}
            skills={skills}
            selected={selected}
            onChange={changeDraft}
            onSave={() => void save()}
            onCancel={cancelDraft}
            onDelete={handleDelete}
            onCheckLink={() => selectedId && void checkLink(selectedId)}
            onPublish={() => selectedId && void publish(selectedId)}
          />
        </div>

        <CorrespondencesTable
          skillId={draft?.skillId ?? null}
          skillTitle={skillTitle}
          items={skillResources}
          loading={skillResourcesLoading}
          busy={busy}
          selectedId={selectedId}
          onSelect={selectResource}
          onPublish={(id) => void publish(id)}
          onCheckLink={(id) => void checkLink(id)}
          onBulkPublish={() => void handleBulkPublish()}
        />
      </div>
    </AdminShell>
  );
}
