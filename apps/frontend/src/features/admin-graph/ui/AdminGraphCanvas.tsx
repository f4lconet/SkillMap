'use client';

import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  MarkerType,
  ConnectionLineType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AdminSkillNode, type AdminNodeData } from './AdminSkillNode';
import {
  buildNodePositions,
  type AdminGraphEdge,
  type AdminGraphNode,
  type NodePosition,
} from '@/entities/admin-graph';

const nodeTypes: NodeTypes = {
  adminSkill: AdminSkillNode,
};

const EDGE_STYLE = {
  required: { stroke: '#C5CBD6', strokeWidth: 1.5 },
  recommended: { stroke: '#A8B0C0', strokeWidth: 1.5, strokeDasharray: '6 4' },
} as const;

type Props = {
  nodes: AdminGraphNode[];
  edges: AdminGraphEdge[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Сохраняет координаты узла после drag&drop (PATCH /admin/skills/{id}/position). */
  onNodeMove: (skillId: string, x: number, y: number) => void;
};

function toFlowNodes(
  nodes: AdminGraphNode[],
  positions: Map<string, NodePosition>,
  selectedId: string | null
): Node<AdminNodeData>[] {
  return nodes.map((node) => ({
    id: node.id,
    type: 'adminSkill',
    position: positions.get(node.id) ?? { x: 0, y: 0 },
    selected: node.id === selectedId,
    data: {
      title: node.title,
      subtitle: node.subtitle,
      publishState: node.publishState,
    },
  }));
}

function toFlowEdges(edges: AdminGraphEdge[]): Edge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.prerequisiteId,
    target: edge.skillId,
    type: 'smoothstep',
    style: EDGE_STYLE[edge.depType],
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 14,
      height: 14,
      color: EDGE_STYLE[edge.depType].stroke,
    },
  }));
}

export function AdminGraphCanvas({
  nodes,
  edges,
  selectedId,
  onSelect,
  onNodeMove,
}: Props) {
  const positions = useMemo(() => buildNodePositions(nodes), [nodes]);
  const flowNodes = useMemo(
    () => toFlowNodes(nodes, positions, selectedId),
    [nodes, positions, selectedId]
  );
  const flowEdges = useMemo(() => toFlowEdges(edges), [edges]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(flowNodes);
  const [rfEdges, , onEdgesChange] = useEdgesState(flowEdges);

  // Пересинхронизация после загрузки графа, создания/удаления узлов и drag&drop.
  const layoutKey = useMemo(
    () =>
      nodes
        .map((n) => `${n.id}:${n.posX ?? 'auto'}:${n.posY ?? 'auto'}:${n.publishState}`)
        .join('|'),
    [nodes]
  );

  useEffect(() => {
    setRfNodes(flowNodes);
  }, [layoutKey, flowNodes, setRfNodes]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => onSelect(node.id),
    [onSelect]
  );

  return (
    <div className="relative h-[420px] w-full rounded-xl bg-[#F8F9FC]">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodeDragStop={(_, node) =>
          onNodeMove(node.id, node.position.x, node.position.y)
        }
        onPaneClick={() => onSelect(null)}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.4}
        maxZoom={1.5}
        connectionLineType={ConnectionLineType.SmoothStep}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
      >
        <Background gap={20} size={1} color="#E3E7F0" />
        <Controls
          showInteractive={false}
          className="!overflow-hidden !rounded-xl !border !border-border !bg-surface !shadow-soft"
        />
      </ReactFlow>
      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-body text-secondary">
          В графе пока нет навыков. Нажмите «Добавить навык», чтобы создать первый
          узел.
        </div>
      )}
    </div>
  );
}
