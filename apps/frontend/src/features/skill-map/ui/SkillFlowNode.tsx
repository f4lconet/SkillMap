'use client';

import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { cn } from '@/shared/lib/cn';
import type { SkillMapNodeData, SkillNodeStatus } from '../model/types';

export type SkillNodeType = Node<SkillMapNodeData, 'skill'>;

const statusStyles: Record<
  SkillNodeStatus,
  { box: string; dot: string; label: string; labelClass: string }
> = {
  mastered: {
    box: 'border-success bg-[#E7F5EE] text-text',
    dot: 'bg-success',
    label: 'Освоен',
    labelClass: 'text-success',
  },
  'in-progress': {
    box: 'border-accent bg-accent text-white shadow-soft',
    dot: 'bg-white',
    label: 'В процессе',
    labelClass: 'text-white/80',
  },
  available: {
    box: 'border-warning bg-[#FFF8E8] text-text',
    dot: 'bg-warning',
    label: 'Можно начать',
    labelClass: 'text-warning',
  },
  locked: {
    box: 'border-accent bg-surface text-secondary',
    dot: 'bg-[#C5CBD6]',
    label: 'Зависимости не закрыты',
    labelClass: 'text-secondary',
  },
};

function SkillFlowNodeComponent({ data, selected }: NodeProps<SkillNodeType>) {
  const s = statusStyles[data.status];
  const isProgressSelected = data.status === 'in-progress';

  return (
    <div
      className={cn(
        'min-w-[148px] max-w-[180px] rounded-xl border-[1.5px] px-3 py-2.5 transition-shadow',
        s.box,
        selected && !isProgressSelected && 'ring-2 ring-accent/40 ring-offset-1',
        data.status === 'locked' && 'opacity-80'
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-0 !bg-[#A8B0C0]"
      />
      <div className="flex items-start gap-1.5">
        <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', s.dot)} />
        <div className="min-w-0">
          <p
            className={cn(
              'text-sm font-semibold leading-tight',
              isProgressSelected ? 'text-white' : 'text-text'
            )}
          >
            {data.title}
          </p>
          <p
            className={cn(
              'mt-0.5 text-[11px] leading-snug',
              isProgressSelected ? 'text-white/75' : 'text-secondary'
            )}
          >
            {data.subtitle}
          </p>
          <p className={cn('mt-1 text-[11px] font-medium', s.labelClass)}>
            {data.status === 'mastered' ? '✓ ' : ''}
            {s.label}
          </p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-0 !bg-[#A8B0C0]"
      />
    </div>
  );
}

export const SkillFlowNode = memo(SkillFlowNodeComponent);
