'use client';

import { DEPENDENCY_LABELS, type AdminGraphEdge, type AdminGraphNode, type DependencyType } from '@/entities/admin-graph';

type Props = {
  skillId: string | null;
  nodes: AdminGraphNode[];
  edges: AdminGraphEdge[];
  busy: boolean;
  onChangeType: (dependencyId: string, depType: DependencyType) => void;
  onRemove: (dependencyId: string) => void;
};

export function SkillEdgesTable({
  skillId,
  nodes,
  edges,
  busy,
  onChangeType,
  onRemove,
}: Props) {
  const titleOf = (id: string) =>
    nodes.find((node) => node.id === id)?.title ?? '—';

  const related = skillId
    ? edges.filter(
        (edge) => edge.skillId === skillId || edge.prerequisiteId === skillId
      )
    : [];

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <h3 className="text-section text-text">Связи выбранного навыка</h3>

      {!skillId && (
        <p className="mt-3 text-body text-secondary">Выберите навык на графе.</p>
      )}

      {skillId && related.length === 0 && (
        <p className="mt-3 text-body text-secondary">У навыка пока нет связей.</p>
      )}

      {related.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-body">
            <thead>
              <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-secondary">
                <th className="pb-2 pr-3 font-semibold">Основа</th>
                <th className="pb-2 pr-3 font-semibold">Зависит</th>
                <th className="pb-2 pr-3 font-semibold">Тип</th>
                <th className="pb-2 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {related.map((edge) => (
                <tr key={edge.id} className="border-b border-border last:border-b-0">
                  <td className="py-3 pr-3 font-medium text-text">
                    {titleOf(edge.prerequisiteId)}
                    <span className="ml-1 text-secondary">→</span>
                  </td>
                  <td className="py-3 pr-3 text-text">
                    {titleOf(edge.skillId)}
                  </td>
                  <td className="py-3 pr-3">
                    <select
                      className="h-9 rounded-lg border border-border bg-surface px-2 text-helper text-text outline-none focus:border-accent disabled:opacity-50"
                      value={edge.depType}
                      disabled={busy}
                      onChange={(e) =>
                        onChangeType(
                          edge.id,
                          e.target.value as DependencyType
                        )
                      }
                    >
                      {(['required', 'recommended'] as DependencyType[]).map(
                        (type) => (
                          <option key={type} value={type}>
                            {DEPENDENCY_LABELS[type]}
                          </option>
                        )
                      )}
                    </select>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onRemove(edge.id)}
                      disabled={busy}
                      className="text-secondary hover:text-danger disabled:opacity-50"
                      aria-label="Удалить связь"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
