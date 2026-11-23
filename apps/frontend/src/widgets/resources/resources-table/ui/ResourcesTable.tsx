import { Badge } from '@/shared/ui/badge/Badge';
import { Button } from '@/shared/ui/button/Button';
import { cn } from '@/shared/lib/cn';
import {
  RESOURCE_LINK_STATUS_LABELS,
  RESOURCE_STATUS_LABELS,
  RESOURCE_TYPE_LABELS,
  type AdminResource,
  type ResourceLinkStatus,
  type ResourceStatus,
} from '@/entities/admin-resource';

const STATUS_VARIANT: Record<
  ResourceStatus,
  'success' | 'neutral' | 'error'
> = {
  published: 'success',
  draft: 'neutral',
  needs_review: 'error',
};

const LINK_VARIANT: Record<
  ResourceLinkStatus,
  'success' | 'error' | 'neutral'
> = {
  ok: 'success',
  broken: 'error',
  unknown: 'neutral',
};

function ExternalLinkIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className="ml-1 inline opacity-60"
    >
      <path
        d="M10.5 1.5H7.5M10.5 1.5V4.5M10.5 1.5L5.5 6.5M5 2.5H2.5C1.94772 2.5 1.5 2.94772 1.5 3.5V9.5C1.5 10.0523 1.94772 10.5 2.5 10.5H8.5C9.05228 10.5 9.5 10.0523 9.5 9.5V7"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Props = {
  items: AdminResource[];
  total: number;
  offset: number;
  limit: number;
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPage: (offset: number) => void;
};

export function ResourcesTable({
  items,
  total,
  offset,
  limit,
  loading,
  selectedId,
  onSelect,
  onPage,
}: Props) {
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + items.length, total);
  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold text-text">Учебные материалы</h2>
        <span className="text-sm text-secondary">Всего · {total}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium tracking-wider text-secondary uppercase">
              <th className="px-5 py-3 font-medium">Ресурс</th>
              <th className="px-5 py-3 font-medium">Навык</th>
              <th className="px-5 py-3 font-medium">Тип</th>
              <th className="px-5 py-3 font-medium">Статус</th>
              <th className="px-5 py-3 font-medium">Ссылка</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-secondary">
                  Загружаем ресурсы…
                </td>
              </tr>
            )}

            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-secondary">
                  Ничего не найдено. Измените фильтры или добавьте первый ресурс.
                </td>
              </tr>
            )}

            {items.map((resource) => (
              <tr
                key={resource.id}
                onClick={() => onSelect(resource.id)}
                className={cn(
                  'cursor-pointer border-b border-border/60 last:border-0 transition-colors',
                  resource.id === selectedId ? 'bg-accent/5' : 'hover:bg-page/60'
                )}
              >
                <td className="px-5 py-3.5">
                  <div className="font-medium text-text">{resource.title}</div>
                  <div className="mt-0.5 flex items-center text-xs text-secondary">
                    {resource.provider || resource.url || 'Источник не указан'}
                    {resource.url && <ExternalLinkIcon />}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-secondary">
                  {resource.skillTitle}
                </td>
                <td className="px-5 py-3.5 text-secondary">
                  {RESOURCE_TYPE_LABELS[resource.resourceType]}
                </td>
                <td className="px-5 py-3.5">
                  <Badge variant={STATUS_VARIANT[resource.status]}>
                    {RESOURCE_STATUS_LABELS[resource.status]}
                  </Badge>
                </td>
                <td className="px-5 py-3.5">
                  <Badge variant={LINK_VARIANT[resource.linkStatus]}>
                    {RESOURCE_LINK_STATUS_LABELS[resource.linkStatus]}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <span className="text-sm text-secondary">
          {from}–{to} из {total} ресурсов
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPage(Math.max(offset - limit, 0))}
            disabled={!canPrev || loading}
          >
            ←
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPage(offset + limit)}
            disabled={!canNext || loading}
          >
            →
          </Button>
        </div>
      </div>
    </div>
  );
}
