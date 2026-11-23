'use client';

import { Badge } from '@/shared/ui/badge/Badge';
import { Button } from '@/shared/ui/button/Button';
import { Checkbox } from '@/shared/ui/checkbox/Checkbox';
import { Input } from '@/shared/ui/input/Input';
import { Select } from '@/shared/ui/select/Select';
import type { AdminSkill } from '@/entities/admin-graph';
import {
  RESOURCE_LANG_OPTIONS,
  RESOURCE_LINK_STATUS_LABELS,
  RESOURCE_STATUS_LABELS,
  RESOURCE_STATUS_OPTIONS,
  RESOURCE_TYPE_LABELS,
  RESOURCE_TYPE_OPTIONS,
  type AdminResource,
  type AdminResourceDraft,
  type ResourceLinkStatus,
} from '@/entities/admin-resource';
import type { ResourceBusy } from '@/features/admin-resources';

const LINK_VARIANT: Record<
  ResourceLinkStatus,
  'success' | 'error' | 'neutral'
> = {
  ok: 'success',
  broken: 'error',
  unknown: 'neutral',
};

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M2 4h12M5.333 4V2.667a1.333 1.333 0 0 1 1.334-1.334h2.666a1.333 1.333 0 0 1 1.334 1.334V4m2 0v9.333a1.333 1.333 0 0 1-1.334 1.334H4.667a1.333 1.333 0 0 1-1.334-1.334V4h9.334Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Props = {
  draft: AdminResourceDraft | null;
  isNew: boolean;
  busy: ResourceBusy;
  skills: AdminSkill[];
  selected: AdminResource | null;
  onChange: (patch: Partial<AdminResourceDraft>) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onCheckLink: () => void;
  onPublish: () => void;
};

export function ResourceSidebar({
  draft,
  isNew,
  busy,
  skills,
  selected,
  onChange,
  onSave,
  onCancel,
  onDelete,
  onCheckLink,
  onPublish,
}: Props) {
  if (!draft) {
    return (
      <div className="sticky top-6 rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-2 text-base font-semibold text-text">
          Свойства ресурса
        </h2>
        <p className="text-sm text-secondary">
          Выберите материал в таблице или создайте новый, чтобы отредактировать
          его свойства.
        </p>
      </div>
    );
  }

  const disabled = busy !== null;
  const skillOptions = skills.map((skill) => ({
    value: skill.id,
    label: skill.title,
  }));

  return (
    <div className="sticky top-6 rounded-xl border border-border bg-surface p-5">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-base font-semibold text-text">
          {isNew ? 'Новый ресурс' : 'Свойства ресурса'}
        </h2>
        {!isNew && selected && (
          <Badge variant={LINK_VARIANT[selected.linkStatus]}>
            {RESOURCE_LINK_STATUS_LABELS[selected.linkStatus]}
          </Badge>
        )}
      </div>

      <div className="space-y-4">
        <Input
          label="Название"
          value={draft.title}
          onChange={(event) => onChange({ title: event.target.value })}
          disabled={disabled}
          placeholder="Промисы, async / await"
        />

        <Select
          label="Навык"
          options={skillOptions}
          placeholder="Выберите навык"
          value={draft.skillId}
          onChange={(event) => onChange({ skillId: event.target.value })}
          disabled={disabled}
        />

        <Input
          label="Ссылка"
          value={draft.url}
          onChange={(event) => onChange({ url: event.target.value })}
          disabled={disabled}
          placeholder="learn.javascript.ru/async"
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Тип материала"
            options={RESOURCE_TYPE_OPTIONS}
            value={draft.resourceType}
            onChange={(event) =>
              onChange({
                resourceType: event.target.value as AdminResourceDraft['resourceType'],
              })
            }
            disabled={disabled}
          />
          <Select
            label="Статус"
            options={RESOURCE_STATUS_OPTIONS}
            value={draft.status}
            onChange={(event) =>
              onChange({
                status: event.target.value as AdminResourceDraft['status'],
              })
            }
            disabled={disabled}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Время, ч"
            inputMode="numeric"
            value={draft.estimatedHours}
            onChange={(event) => onChange({ estimatedHours: event.target.value })}
            disabled={disabled}
            placeholder="2"
          />
          <Input
            label="Позиция"
            inputMode="numeric"
            value={draft.position}
            onChange={(event) => onChange({ position: event.target.value })}
            disabled={disabled}
            placeholder="1"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Язык"
            options={RESOURCE_LANG_OPTIONS}
            value={draft.lang}
            onChange={(event) => onChange({ lang: event.target.value })}
            disabled={disabled}
          />
          <Input
            label="Провайдер"
            value={draft.provider}
            onChange={(event) => onChange({ provider: event.target.value })}
            disabled={disabled}
            placeholder="MDN"
          />
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-secondary">
            Описание
          </span>
          <textarea
            value={draft.description}
            onChange={(event) => onChange({ description: event.target.value })}
            disabled={disabled}
            rows={3}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Чему учит материал и зачем он нужен"
          />
        </label>

        <Checkbox
          label="Бесплатный материал"
          checked={draft.isFree}
          onChange={(event) => onChange({ isFree: event.target.checked })}
          disabled={disabled}
        />

        <div className="flex items-center justify-between pt-1 text-sm">
          <span className="text-secondary">
            {RESOURCE_TYPE_LABELS[draft.resourceType]} ·{' '}
            {RESOURCE_STATUS_LABELS[draft.status]}
          </span>
          {!isNew && selected && (
            <button
              type="button"
              onClick={onCheckLink}
              disabled={disabled}
              className="font-medium text-accent hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              Проверить ссылку
            </button>
          )}
        </div>

        <div className="space-y-2 pt-2">
          <Button
            variant="primary"
            className="w-full"
            onClick={onSave}
            isLoading={busy === 'save'}
            disabled={disabled}
          >
            {isNew ? 'Создать ресурс' : 'Сохранить'}
          </Button>

          {!isNew && selected && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={onPublish}
              isLoading={busy === 'publish'}
              disabled={disabled || selected.status === 'published'}
            >
              {selected.status === 'published'
                ? 'Уже опубликован'
                : 'Опубликовать'}
            </Button>
          )}

          {isNew && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={onCancel}
              disabled={disabled}
            >
              Отмена
            </Button>
          )}

          {!isNew && selected && (
            <Button
              variant="destructive"
              className="w-full"
              leftIcon={<TrashIcon />}
              onClick={onDelete}
              isLoading={busy === 'delete'}
              disabled={disabled}
            >
              Удалить ресурс
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
