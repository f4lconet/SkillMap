'use client';

import type { ExportPayload } from '@/entities/public-profile';

interface PrintablePdfReportProps {
  payload: ExportPayload;
}

const statusLabels = {
  mastered: 'Освоен',
  learning: 'В процессе',
  not_started: 'Не начат',
  skipped: 'Пропущен',
} as const;

export function PrintablePdfReport({ payload }: PrintablePdfReportProps) {
  const { meta, user, profession, map, gap, plan, notes } = payload;
  const generatedAt = new Date(meta.generatedAt).toLocaleString('ru-RU');
  const remainingHours =
    gap.estimatedRemainingHours ?? plan.weeks.reduce(
      (sum, week) => sum + week.estimatedHours,
      0
    );

  return (
    <article className="pdf-report" aria-label="Отчёт для экспорта в PDF">
      <header className="avoid-break" style={{ borderBottom: '2px solid #5357D9', paddingBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
          <div>
            <p style={{ color: '#5357D9', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
              SkillMap · Отчёт о карьере
            </p>
            <h1 style={{ margin: '6px 0 4px', fontSize: 26 }}>
              {profession.title}
            </h1>
            <p style={{ margin: 0, color: '#707B91', fontSize: 12 }}>
              {user.name} · {generatedAt}
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: '#707B91' }}>
            <p style={{ margin: 0 }}>Прогресс цели</p>
            <strong style={{ color: '#182137', fontSize: 28 }}>
              {Math.round(gap.matchPercent ?? gap.progressPercent)}%
            </strong>
          </div>
        </div>
      </header>

      <section className="avoid-break" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
        <div style={{ border: '1px solid #E3E7F0', borderRadius: 10, padding: 12 }}>
          <p style={{ margin: 0, color: '#707B91', fontSize: 11 }}>Освоено</p>
          <strong style={{ fontSize: 20 }}>{gap.mastered.length} навыков</strong>
        </div>
        <div style={{ border: '1px solid #E3E7F0', borderRadius: 10, padding: 12 }}>
          <p style={{ margin: 0, color: '#707B91', fontSize: 11 }}>Осталось часов</p>
          <strong style={{ fontSize: 20 }}>{remainingHours} ч</strong>
        </div>
        <div style={{ border: '1px solid #E3E7F0', borderRadius: 10, padding: 12 }}>
          <p style={{ margin: 0, color: '#707B91', fontSize: 11 }}>Темп обучения</p>
          <strong style={{ fontSize: 20 }}>{plan.hoursPerWeek} ч/нед</strong>
        </div>
      </section>

      <section style={{ marginTop: 22 }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 18 }}>Карта навыков</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {map.skills.map((skill) => {
            const status = skill.locked
              ? 'locked'
              : skill.userStatus === 'mastered'
                ? 'mastered'
                : skill.userStatus === 'learning'
                  ? 'learning'
                  : 'not_started';
            const colors = {
              mastered: { background: '#E7F5EE', border: '#218166', label: 'Освоен' },
              learning: { background: '#EEEDFF', border: '#5357D9', label: 'В процессе' },
              not_started: { background: '#FFF8E8', border: '#A66B17', label: 'Предстоит' },
              locked: { background: '#F6F7FB', border: '#C5CBD6', label: 'Заблокирован' },
            }[status];

            return (
              <div
                className="avoid-break"
                key={skill.id}
                style={{
                  breakInside: 'avoid',
                  border: `1px solid ${colors.border}`,
                  borderLeftWidth: 5,
                  borderRadius: 8,
                  background: colors.background,
                  padding: '8px 10px',
                }}
              >
                <strong style={{ display: 'block', fontSize: 12 }}>{skill.title}</strong>
                <span style={{ color: '#707B91', fontSize: 10 }}>
                  Слой {skill.layer} · {skill.estimatedHours ?? 0} ч · {colors.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="page-break" style={{ marginTop: 18 }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 18 }}>Gap Analysis</h2>
        {gap.learning.length > 0 && (
          <div className="avoid-break" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 14 }}>В процессе</h3>
            {gap.learning.map((item) => (
              <p key={item.skill.id} style={{ margin: '3px 0', fontSize: 12 }}>
                • {item.skill.title} — {statusLabels[item.status]}
              </p>
            ))}
          </div>
        )}
        {gap.missing.length > 0 && (
          <div className="avoid-break">
            <h3 style={{ margin: '0 0 6px', fontSize: 14 }}>Нужно освоить</h3>
            {gap.missing.map((item) => (
              <p key={item.skill.id} style={{ margin: '3px 0', fontSize: 12 }}>
                • {item.skill.title}
                {item.skill.estimatedHours ? ` — ${item.skill.estimatedHours} ч` : ''}
              </p>
            ))}
          </div>
        )}
      </section>

      <section className="page-break" style={{ marginTop: 18 }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 18 }}>План обучения</h2>
        {plan.weeks.map((week) => (
          <div className="avoid-break" key={week.week} style={{ borderTop: '1px solid #E3E7F0', padding: '8px 0' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 14 }}>
              Неделя {week.week}: {week.title || week.focus}
            </h3>
            {week.items.length > 0 ? week.items.map((item) => (
              <p key={`${week.week}-${item.skill.id}`} style={{ margin: '3px 0', fontSize: 12 }}>
                • {item.skill.title} — {item.hours} ч
                {item.resources.length > 0
                  ? ` · ${item.resources.map((resource) => resource.title).join(', ')}`
                  : ''}
              </p>
            )) : (
              <p style={{ margin: '3px 0', color: '#707B91', fontSize: 12 }}>Нет запланированных задач</p>
            )}
          </div>
        ))}
      </section>

      {(notes.length > 0 || meta.shareUrl) && (
        <footer className="avoid-break" style={{ marginTop: 18, borderTop: '1px solid #E3E7F0', paddingTop: 10, color: '#707B91', fontSize: 10 }}>
          {notes.map((note) => <p key={note} style={{ margin: '2px 0' }}>{note}</p>)}
          {meta.shareUrl && <p style={{ margin: '2px 0' }}>Публичная карта: {meta.shareUrl}</p>}
        </footer>
      )}
    </article>
  );
}
