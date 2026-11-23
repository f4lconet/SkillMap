'use client';

import { Badge } from '@/shared/ui/badge/Badge';
import { Button } from '@/shared/ui/button/Button';
import {
  RESOURCE_STATUS_LABELS,
  RESOURCE_TYPE_LABELS,
  type AdminResource,
  type ResourceStatus,
} from '@/entities/admin-resource';
import type { ResourceBusy } from '@/features/admin-resources';

const STATUS_VARIANT: Record<
  ResourceStatus,
  'success' | 'neutral' | 'error'
> = {
  published: 'success',
  draft: 'neutral',
  needs_review: 'error',
};

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M11.333 2.00001C11.5081 1.8249 11.716 1.68607 11.9447 1.59133C12.1735 1.49658 12.4187 1.44775 12.6667 1.44775C12.9146 1.44775 13.1599 1.49658 13.3886 1.59133C13.6174 1.68607 13.8252 1.8249 14.0003 2.00001C14.1754 2.17512 14.3143 2.383 14.409 2.61175C14.5038 2.8405 14.5526 3.08577 14.5526 3.33368C14.5526 3.58158 14.5038 3.82686 14.409 4.05561C14.3143 4.28435 14.1754 4.49224 14.0003 4.66734L5.00033 13.6673L1.33366 14.6673L2.33366 11L11.333 2.00001Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M13.65 2.35A7.958 7.958 0 0 0 8 0.5C3.86 0.5 0.5 3.86 0.5 8s3.36 7.5 7.5 7.5c3.73 0 6.84-2.55 7.35-6h-2.02A5.5 5.5 0 1 1 8 2.5c1.52 0 2.9.62 3.89 1.61L9.5 6.5h6V0.5l-1.85 1.85Z"
        fill="currentColor"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M14 10v2.667A1.333 1.333 0 0 1 12.667 14H3.333A1.333 1.333 0 0 1 2 12.667V10M11.333 5.333 8 2 4.667 5.333M8 2v8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function orderLabel(resource: AdminResource) {
  const hours =
    resource.estimatedHours !== null
      ? `${resource.estimatedHours} ч`
      : 'время не указано';
  return `${resource.position} · ${hours}`;
}

type Props = {
  skillId: string | null;
  skillTitle: string | null;
  items: AdminResource[];
  loading: boolean;
  busy: ResourceBusy;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPublish: (id: string) => void;
  onCheckLink: (id: string) => void;
  onBulkPublish: () => void;
};

export function CorrespondencesTable({
  skillId,
  skillTitle,
  items,
  loading,
  busy,
  selectedId,
  onSelect,
  onPublish,
  onCheckLink,
  onBulkPublish,
}: Props) {
  const draftCount = items.filter(
    (item) => item.status !== 'published'
  ).length;
  const disabled = busy !== null;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold text-text">
          Таблица соответствий
          {skillTitle ? ` · ${skillTitle}` : ''}
        </h2>
        <p className="mt-0.5 text-sm text-secondary">
          Порядок материалов в траектории обучения по выбранному навыку.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium tracking-wider text-secondary uppercase">
              <th className="px-5 py-3 font-medium">Ресурс</th>
              <th className="px-5 py-3 font-medium">Тип</th>
              <th className="px-5 py-3 font-medium">Порядок / Время</th>
              <th className="px-5 py-3 font-medium">Статус</th>
              <th className="px-5 py-3 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {!skillId && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-secondary">
                  Выберите навык в панели свойств, чтобы увидеть материалы.
                </td>
              </tr>
            )}

            {skillId && loading && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-secondary">
                  Загружаем материалы навыка…
                </td>
              </tr>
            )}

            {skillId && !loading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-secondary">
                  У навыка пока нет материалов. Создайте ресурс и сохраните его.
                </td>
              </tr>
            )}

            {items.map((item) => (
              <tr
                key={item.id}
                className={
                  item.id === selectedId
                    ? 'border-b border-border/60 bg-accent/5 last:border-0'
                    : 'border-b border-border/60 last:border-0 hover:bg-page/60'
                }
              >
                <td className="px-5 py-3.5 font-medium text-text">
                  {item.title}
                </td>
                <td className="px-5 py-3.5 text-secondary">
                  {RESOURCE_TYPE_LABELS[item.resourceType]}
                </td>
                <td className="px-5 py-3.5 text-secondary">
                  {orderLabel(item)}
                </td>
                <td className="px-5 py-3.5">
                  <Badge variant={STATUS_VARIANT[item.status]}>
                    {RESOURCE_STATUS_LABELS[item.status]}
                  </Badge>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Открыть в редакторе"
                      onClick={() => onSelect(item.id)}
                      className="p-1 text-secondary transition-colors hover:text-accent"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      title="Проверить ссылку"
                      onClick={() => onCheckLink(item.id)}
                      disabled={disabled}
                      className="p-1 text-secondary transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RefreshIcon />
                    </button>
                    {item.status !== 'published' && (
                      <button
                        type="button"
                        title="Опубликовать"
                        onClick={() => onPublish(item.id)}
                        disabled={disabled}
                        className="p-1 text-secondary transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <UploadIcon />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-secondary">
          Изменения появятся у студентов после публикации.
        </p>
        <Button
          variant="primary"
          leftIcon={<UploadIcon />}
          onClick={onBulkPublish}
          disabled={disabled || draftCount === 0}
          isLoading={busy === 'bulk'}
        >
          Опубликовать черновики ({draftCount})
        </Button>
      </div>
    </div>
  );
}
