'use client';

import { useState } from 'react';
import { Button, Input, Select } from '@/shared/ui';
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_OPTIONS,
  PUBLISH_LABELS,
  type AdminGraphNode,
  type AdminSkillPatch,
  type PublishStatus,
} from '@/entities/admin-graph';

type Props = {
  skill: AdminGraphNode | null;
  nodes: AdminGraphNode[];
  prerequisiteIds: string[];
  saving: boolean;
  onSave: (patch: AdminSkillPatch, prerequisiteIds: string[]) => void;
  onDelete: () => void;
};

const STATE_BADGE: Record<PublishStatus, string> = {
  published: 'bg-success-soft text-success',
  modified: 'bg-[#FFF8E8] text-warning',
  new: 'bg-[#FFF8E8] text-warning',
  draft: 'bg-page text-secondary',
};

const DIFFICULTY_OPTIONS_UI = DIFFICULTY_OPTIONS.map((value) => ({
  value: String(value),
  label: DIFFICULTY_LABELS[value] ?? String(value),
}));

export function SkillEditorPanel({
  skill,
  nodes,
  prerequisiteIds,
  saving,
  onSave,
  onDelete,
}: Props) {
  const [title, setTitle] = useState(skill?.title ?? '');
  const [subtitle, setSubtitle] = useState(skill?.subtitle ?? '');
  const [category, setCategory] = useState(skill?.category ?? '');
  const [difficulty, setDifficulty] = useState(String(skill?.difficulty ?? 3));
  const [hours, setHours] = useState(
    skill?.estimatedHours === null || skill?.estimatedHours === undefined
      ? ''
      : String(skill.estimatedHours)
  );
  const [description, setDescription] = useState(skill?.description ?? '');
  const [prereqs, setPrereqs] = useState<string[]>(prerequisiteIds);
  const [error, setError] = useState<string | null>(null);

  if (!skill) {
    return (
      <aside className="rounded-2xl border border-border bg-surface p-5 text-body text-secondary shadow-soft">
        Выберите навык на графе, чтобы редактировать.
      </aside>
    );
  }

  const titleById = new Map(nodes.map((node) => [node.id, node.title]));
  const available = nodes.filter(
    (node) => node.id !== skill.id && !prereqs.includes(node.id)
  );

  const handleSave = () => {
    if (!title.trim()) {
      setError('Укажите название навыка.');
      return;
    }
    const hoursValue = hours.trim() === '' ? null : Number(hours);
    if (hoursValue !== null && (!Number.isFinite(hoursValue) || hoursValue < 0)) {
      setError('Часы должны быть неотрицательным числом.');
      return;
    }
    setError(null);
    onSave(
      {
        title: title.trim(),
        subtitle: subtitle.trim(),
        category: category.trim(),
        description,
        difficulty: Number(difficulty),
        estimatedHours: hoursValue === null ? null : Math.round(hoursValue),
      },
      prereqs
    );
  };

  return (
    <aside className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
          Навык
        </p>
        <span
          className={`rounded-full px-2.5 py-1 text-helper font-medium ${STATE_BADGE[skill.publishState]}`}
        >
          {PUBLISH_LABELS[skill.publishState]}
        </span>
      </div>

      <p className="mt-1 truncate text-helper text-secondary" title={skill.slug}>
        /{skill.slug}
      </p>

      <label className="mt-4 block">
        <span className="text-helper font-medium text-secondary">Название</span>
        <Input
          className="mt-1.5"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <label className="mt-3 block">
        <span className="text-helper font-medium text-secondary">Подзаголовок</span>
        <Input
          className="mt-1.5"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
        />
      </label>

      <label className="mt-3 block">
        <span className="text-helper font-medium text-secondary">Категория</span>
        <Input
          className="mt-1.5"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
      </label>

      <div className="mt-3">
        <Select
          label="Сложность"
          options={DIFFICULTY_OPTIONS_UI}
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        />
      </div>

      <label className="mt-3 block">
        <span className="text-helper font-medium text-secondary">
          Время изучения, ч
        </span>
        <Input
          className="mt-1.5"
          type="number"
          min={0}
          step={1}
          placeholder="8"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
        />
      </label>

      <label className="mt-3 block">
        <span className="text-helper font-medium text-secondary">Описание</span>
        <textarea
          className="mt-1.5 min-h-[88px] w-full resize-y rounded-xl border border-border bg-surface px-3 py-2.5 text-body text-text outline-none focus:border-accent"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <div className="mt-3">
        <p className="text-helper font-medium text-secondary">
          Обязательные основы
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {prereqs.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setPrereqs((prev) => prev.filter((p) => p !== id))}
              className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-helper font-medium text-success"
              title="Убрать основу"
            >
              {titleById.get(id) ?? 'Навык'}{' '}
              <span className="text-success/70">×</span>
            </button>
          ))}
          {prereqs.length === 0 && (
            <span className="text-helper text-secondary">Пока не выбраны</span>
          )}
        </div>
        {available.length > 0 && (
          <select
            className="mt-2 w-full rounded-xl border border-dashed border-border bg-page px-2 py-1.5 text-helper text-secondary"
            value=""
            onChange={(e) => {
              const id = e.target.value;
              if (id) setPrereqs((prev) => [...prev, id]);
            }}
          >
            <option value="">+ Добавить основу</option>
            {available.map((node) => (
              <option key={node.id} value={node.id}>
                {node.title}
              </option>
            ))}
          </select>
        )}
        <p className="mt-1.5 text-helper text-secondary">
          Изменения основ сохранятся вместе с навыком.
        </p>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-helper text-danger">
          {error}
        </p>
      )}

      <Button
        variant="primary"
        className="mt-5 w-full"
        isLoading={saving}
        onClick={handleSave}
      >
        Сохранить навык
      </Button>

      <button
        type="button"
        onClick={onDelete}
        disabled={saving}
        className="mt-3 w-full text-center text-helper font-medium text-danger hover:underline disabled:opacity-50"
      >
        🗑 Удалить навык
      </button>
    </aside>
  );
}
