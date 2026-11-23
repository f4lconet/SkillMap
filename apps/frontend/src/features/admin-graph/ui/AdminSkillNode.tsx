'use client';

import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { cn } from '@/shared/lib/cn';
import type { PublishStatus } from '@/entities/admin-graph';

export type AdminNodeData = {
  title: string;
  subtitle: string;
  publishState: PublishStatus;
};

export type AdminFlowNode = Node<AdminNodeData, 'adminSkill'>;

const styles: Record<
  PublishStatus,
  { box: string; dot: string; label: string; labelClass: string }
> = {
  published: {
    box: 'border-[#B8E0C8] bg-[#E7F5EE] text-text',
    dot: 'bg-success',
    label: 'Опубликован',
    labelClass: 'text-success',
  },
  modified: {
    box: 'border-accent bg-accent text-white shadow-soft',
    dot: 'bg-white',
    label: 'Есть изменения',
    labelClass: 'text-white/80',
  },
  new: {
    box: 'border-[#E8D4A8] bg-[#FFF8E8] text-text',
    dot: 'bg-warning',
    label: 'Новый',
    labelClass: 'text-warning',
  },
  draft: {
    box: 'border-border bg-surface text-secondary',
    dot: 'bg-[#C5CBD6]',
    label: 'Черновик',
    labelClass: 'text-secondary',
  },
};

function AdminSkillNodeComponent({ data, selected }: NodeProps<AdminFlowNode>) {
  const s = styles[data.publishState];
  const isMod = data.publishState === 'modified';

  return (
    <div
      className={cn(
        'min-w-[148px] max-w-[180px] rounded-xl border px-3 py-2.5 transition-shadow',
        s.box,
        selected && !isMod && 'ring-2 ring-accent/40 ring-offset-1'
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-[#A8B0C0]" />
      <div className="flex items-start gap-1.5">
        <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', s.dot)} />
        <div className="min-w-0">
          <p className={cn('text-sm font-semibold leading-tight', isMod ? 'text-white' : 'text-text')}>
            {data.title}
          </p>
          <p className={cn('mt-0.5 text-[11px] leading-snug', isMod ? 'text-white/75' : 'text-secondary')}>
            {data.subtitle}
          </p>
          <p className={cn('mt-1 text-[11px] font-medium', s.labelClass)}>{s.label}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-[#A8B0C0]" />
    </div>
  );
}

export const AdminSkillNode = memo(AdminSkillNodeComponent);
