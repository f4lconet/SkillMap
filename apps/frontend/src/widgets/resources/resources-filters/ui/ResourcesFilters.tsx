import { Input } from '@/shared/ui/input/Input';
import { Select } from '@/shared/ui/select/Select';
import { Button } from '@/shared/ui/button/Button';
import type { AdminProfession } from '@/entities/admin-graph';
import {
  RESOURCE_SORT_OPTIONS,
  RESOURCE_STATUS_OPTIONS,
  RESOURCE_TYPE_OPTIONS,
} from '@/entities/admin-resource';
import type { ResourceFilters } from '@/features/admin-resources';

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M7.333 12.667A5.333 5.333 0 1 0 7.333 2a5.333 5.333 0 0 0 0 10.667ZM14 14l-2.9-2.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Props = {
  filters: ResourceFilters;
  professions: AdminProfession[];
  busy: boolean;
  onChange: <K extends keyof ResourceFilters>(
    key: K,
    value: ResourceFilters[K]
  ) => void;
  onReset: () => void;
  onBulkCheck: () => void;
};

export function ResourcesFilters({
  filters,
  professions,
  busy,
  onChange,
  onReset,
  onBulkCheck,
}: Props) {
  const professionOptions = [
    { value: '', label: 'Все профессии' },
    ...professions.map((profession) => ({
      value: profession.id,
      label: profession.title,
    })),
  ];

  const sortOptions = RESOURCE_SORT_OPTIONS.flatMap((option) => [
    { value: `${option.value}:asc`, label: `${option.label} · по возрастанию` },
    { value: `${option.value}:desc`, label: `${option.label} · по убыванию` },
  ]);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-secondary">
          Поиск
        </span>
        <Input
          placeholder="Название, провайдер или URL"
          leftIcon={<SearchIcon />}
          value={filters.q}
          onChange={(event) => onChange('q', event.target.value)}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-secondary">
          Профессия
        </span>
        <Select
          options={professionOptions}
          value={filters.professionId}
          onChange={(event) => onChange('professionId', event.target.value)}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-secondary">
          Тип ресурса
        </span>
        <Select
          options={[{ value: '', label: 'Все типы' }, ...RESOURCE_TYPE_OPTIONS]}
          value={filters.resourceType}
          onChange={(event) =>
            onChange('resourceType', event.target.value as ResourceFilters['resourceType'])
          }
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-secondary">
          Статус
        </span>
        <Select
          options={[{ value: '', label: 'Все статусы' }, ...RESOURCE_STATUS_OPTIONS]}
          value={filters.status}
          onChange={(event) =>
            onChange('status', event.target.value as ResourceFilters['status'])
          }
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-secondary">
          Сортировка
        </span>
        <Select
          options={sortOptions}
          value={`${filters.sortBy}:${filters.sortDir}`}
          onChange={(event) => {
            const [sortBy, sortDir] = event.target.value.split(':');
            onChange('sortBy', sortBy as ResourceFilters['sortBy']);
            onChange('sortDir', sortDir as ResourceFilters['sortDir']);
          }}
        />
      </label>

      <div className="flex items-end gap-2 md:col-span-2 xl:col-span-3">
        <Button variant="secondary" size="sm" onClick={onReset}>
          Сбросить фильтры
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onBulkCheck}
          disabled={busy}
        >
          Проверить ссылки
        </Button>
      </div>
    </div>
  );
}
