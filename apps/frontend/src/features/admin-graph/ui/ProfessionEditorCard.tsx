'use client';

import { useState } from 'react';
import { Button, Input, Select } from '@/shared/ui';
import {
  PROFESSION_LEVEL_OPTIONS,
  type AdminProfession,
  type AdminProfessionUpdate,
  type ProfessionLevel,
} from '@/entities/admin-graph';

type Props = {
  profession: AdminProfession;
  skillsReady: boolean;
  busy: boolean;
  onSave: (patch: AdminProfessionUpdate) => void;
  onDelete: () => void;
};

/** Карточка профессии: локальная форма, монтируется заново через `key` при смене профессии. */
export function ProfessionEditorCard({
  profession,
  skillsReady,
  busy,
  onSave,
  onDelete,
}: Props) {
  const [title, setTitle] = useState(profession.title);
  const [direction, setDirection] = useState(profession.direction);
  const [entryLevel, setEntryLevel] = useState<ProfessionLevel>(
    profession.entryLevel ?? 'beginner'
  );

  return (
    <section className="mt-5 rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-section text-text">Профессия</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            isLoading={busy}
            disabled={!title.trim()}
            onClick={() =>
              onSave({
                title: title.trim(),
                direction: direction.trim(),
                entryLevel,
              })
            }
          >
            Сохранить
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={busy}
            onClick={onDelete}
          >
            Удалить профессию
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Input label="Название" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input
          label="Направление"
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
        />
        <Select
          label="Уровень входа"
          options={PROFESSION_LEVEL_OPTIONS}
          value={entryLevel}
          onChange={(e) => setEntryLevel(e.target.value as ProfessionLevel)}
        />
      </div>

      <p className="mt-3 text-helper text-secondary">
        Слаг: <span className="font-medium text-text">{profession.slug}</span> ·
        Статус:{' '}
        <span className="font-medium text-text">
          {profession.status === 'published' ? 'опубликована' : 'черновик'}
        </span>{' '}
        · Готовность карты:{' '}
        <span className="font-medium text-text">
          {skillsReady ? 'готова' : 'не готова'}
        </span>
      </p>
    </section>
  );
}
