'use client';

import { useMemo } from 'react';
import { Button } from '@/shared/ui';
import {
  difficultyLabel,
  formatDate,
  type AdminProfessionPreview,
  type ProfessionStatus,
} from '@/entities/admin-graph';

type Props = {
  preview: AdminProfessionPreview | null;
  open: boolean;
  onClose: () => void;
};

const STATUS_LABELS: Record<ProfessionStatus, string> = {
  draft: 'Черновик',
  published: 'Опубликовано',
};

/** Предпросмотр карты глазами студента — данные из GET /admin/professions/{id}/preview. */
export function GraphPreviewModal({ preview, open, onClose }: Props) {
  const groups = useMemo(() => {
    if (!preview) return [];
    const byLayer = new Map<number, AdminProfessionPreview['map']['skills']>();
    for (const skill of preview.map.skills) {
      const list = byLayer.get(skill.layer) ?? [];
      list.push(skill);
      byLayer.set(skill.layer, list);
    }
    return [...byLayer.entries()]
      .sort(([a], [b]) => a - b)
      .map(([layer, skills]) => ({
        layer,
        skills: [...skills].sort((a, b) => a.position - b.position),
      }));
  }, [preview]);

  if (!open || !preview) return null;

  const { map } = preview;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Предпросмотр карты профессии"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              Предпросмотр · глазами студента
            </p>
            <h2 className="mt-1 text-section text-text">{map.professionTitle}</h2>
            <p className="mt-1 text-helper text-secondary">
              {STATUS_LABELS[preview.status]} · версия {preview.contentVersion} ·
              опубликовано {formatDate(preview.publishedAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-body text-secondary hover:bg-page hover:text-text"
            aria-label="Закрыть предпросмотр"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-wrap gap-2 text-helper">
            <Chip>Навыки · {map.totalSkills}</Chip>
            <Chip>Слои · {groups.length}</Chip>
            <Chip>Освоено · {map.masteredCount}</Chip>
            <Chip>В процессе · {map.learningCount}</Chip>
            <Chip>Прогресс · {map.progressPercent}%</Chip>
          </div>

          {!map.skillsReady && (
            <p className="mt-3 rounded-xl border border-warning/20 bg-[#FFF8E8] px-3 py-2 text-helper text-warning">
              Карта помечена как неготовая: студентам она не откроется до
              публикации и включения готовности.
            </p>
          )}

          {groups.length === 0 && (
            <p className="mt-4 text-body text-secondary">
              В графе пока нет навыков.
            </p>
          )}

          <div className="mt-4 space-y-5">
            {groups.map((group) => (
              <div key={group.layer}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
                  Слой {group.layer}
                </p>
                <ul className="mt-2 space-y-2">
                  {group.skills.map((skill) => (
                    <li
                      key={skill.id}
                      className="rounded-xl border border-border bg-page/60 px-3 py-2.5"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-body font-medium text-text">
                          {skill.title}
                        </p>
                        <p className="text-helper text-secondary">
                          {difficultyLabel(skill.difficulty)}
                          {skill.estimatedHours !== null &&
                            ` · ${skill.estimatedHours} ч`}
                        </p>
                      </div>
                      {skill.description && (
                        <p className="mt-1 text-helper text-secondary">
                          {skill.description}
                        </p>
                      )}
                      {skill.requiredPrerequisites.length > 0 && (
                        <p className="mt-1 text-helper text-secondary">
                          Основы:{' '}
                          {skill.requiredPrerequisites
                            .map((item) => item.title)
                            .join(', ')}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border px-5 py-3 text-right">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-page px-2.5 py-1 font-medium text-secondary">
      {children}
    </span>
  );
}
