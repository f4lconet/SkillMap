'use client';

import { useMemo, useState } from 'react';
import { Button, Select } from '@/shared/ui';
import {
  DEPENDENCY_LABELS,
  type AdminGraphNode,
  type DependencyType,
} from '@/entities/admin-graph';

type Props = {
  nodes: AdminGraphNode[];
  defaultSkillId: string | null;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (
    skillId: string,
    prerequisiteId: string,
    depType: DependencyType
  ) => void;
};

const TYPE_OPTIONS = (['required', 'recommended'] as DependencyType[]).map(
  (value) => ({ value, label: DEPENDENCY_LABELS[value] })
);

/** Форма создания связи: навык → его основа. */
export function AddDependencyForm({
  nodes,
  defaultSkillId,
  busy,
  onCancel,
  onSubmit,
}: Props) {
  const [skillId, setSkillId] = useState(defaultSkillId ?? nodes[0]?.id ?? '');
  const [prerequisiteId, setPrerequisiteId] = useState('');
  const [depType, setDepType] = useState<DependencyType>('required');
  const [error, setError] = useState<string | null>(null);

  const skillOptions = useMemo(
    () => nodes.map((node) => ({ value: node.id, label: node.title })),
    [nodes]
  );
  const prerequisiteOptions = useMemo(
    () =>
      nodes
        .filter((node) => node.id !== skillId)
        .map((node) => ({ value: node.id, label: node.title })),
    [nodes, skillId]
  );

  const submit = () => {
    if (!skillId || !prerequisiteId) {
      setError('Выберите навык и его основу.');
      return;
    }
    if (skillId === prerequisiteId) {
      setError('Навык не может зависеть от самого себя.');
      return;
    }
    setError(null);
    onSubmit(skillId, prerequisiteId, depType);
  };

  if (nodes.length < 2) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
        <p className="text-body text-secondary">
          Для связи нужно минимум два навыка в графе.
        </p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={onCancel}>
          Закрыть
        </Button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <h3 className="text-section text-text">Новая связь</h3>
      <p className="mt-1 text-helper text-secondary">
        Основа должна быть изучена раньше зависимого навыка.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Select
          label="Зависимый навык"
          options={skillOptions}
          value={skillId}
          onChange={(e) => {
            setSkillId(e.target.value);
            if (e.target.value === prerequisiteId) setPrerequisiteId('');
          }}
        />
        <Select
          label="Основа"
          placeholder="Выберите навык"
          options={prerequisiteOptions}
          value={prerequisiteId}
          onChange={(e) => setPrerequisiteId(e.target.value)}
        />
        <Select
          label="Тип связи"
          options={TYPE_OPTIONS}
          value={depType}
          onChange={(e) => setDepType(e.target.value as DependencyType)}
        />
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-helper text-danger">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="primary" size="sm" isLoading={busy} onClick={submit}>
          Добавить связь
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={onCancel}
        >
          Отмена
        </Button>
      </div>
    </section>
  );
}
