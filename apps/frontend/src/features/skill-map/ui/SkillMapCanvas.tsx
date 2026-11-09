'use client';

import { useCallback, useEffect, useMemo, type MouseEvent as ReactMouseEvent } from 'react';

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  type Node,
  type Edge,
  type NodeTypes,
  type OnSelectionChangeParams,
  MarkerType,
  ConnectionLineType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { SkillFlowNode } from './SkillFlowNode';
import type { SkillMapNodeData, SkillFilter, NodePositions } from '../model/types';

const nodeTypes: NodeTypes = {
  skill: SkillFlowNode,
};

const EDGE_STYLE = { stroke: '#C5CBD6', strokeWidth: 2 };
const EDGE_ACTIVE_STROKE_WIDTH = 4;
const EDGE_ACTIVE_MARKER_SIZE = 20;
const EDGE_MARKER_SIZE = 14;

type Props = {
  nodes: Node<SkillMapNodeData>[];
  edges: Edge[];
  filter: SkillFilter;
  search: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (positions: NodePositions) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

type HistoryButtonProps = {
  label: string;
  shortcut: string;
  disabled: boolean;
  onClick: () => void;
  direction: 'undo' | 'redo';
};

function HistoryButton({
  label,
  shortcut,
  disabled,
  onClick,
  direction,
}: HistoryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${label} (${shortcut})`}
      className="group relative flex h-7 w-7 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-page hover:text-text disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-secondary"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {direction === 'undo' ? (
          <>
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </>
        ) : (
          <>
            <path d="M5 12h14" />
            <path d="M12 5l7 7-7 7" />
          </>
        )}
      </svg>
      <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-text px-2 py-1 text-caption font-medium text-white opacity-0 shadow-soft transition-opacity group-hover:opacity-100 group-disabled:opacity-0">
        {label} · {shortcut}
      </span>
    </button>
  );
}

export function SkillMapCanvas({
  nodes: initialNodes,
  edges: initialEdges,
  filter,
  search,
  selectedId,
  onSelect,
  onMove,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

  // Синхронизируем узлы с данными API и с историей перемещений:
  // статус, появление/исчезновение навыка и отменённая позиция приходят снаружи.
  const nodesKey = useMemo(
    () =>
      initialNodes
        .map((n) => `${n.id}:${n.data.status}:${n.position.x},${n.position.y}`)
        .join('|'),
    [initialNodes]
  );

  useEffect(() => {
    setNodes(
      initialNodes.map((node) => ({ ...node, data: { ...node.data } }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesKey, setNodes]);

  const visibleNodes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return nodes.map((node) => {
      const matchFilter: boolean =
        filter === 'all'
          ? true
          : filter === 'ahead'
            ? node.data.status === 'available' || node.data.status === 'locked'
            : node.data.status === filter;
      const matchSearch =
        !q ||
        node.data.title.toLowerCase().includes(q) ||
        node.data.subtitle.toLowerCase().includes(q);
      return {
        ...node,
        hidden: !matchFilter || !matchSearch,
        selected: node.id === selectedId,
      };
    });
  }, [nodes, filter, search, selectedId]);

  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.filter((n) => !n.hidden).map((n) => n.id)),
    [visibleNodes]
  );

  const visibleEdges = useMemo(() => {
    const hasSelection = selectedId != null;
    return initialEdges
      .filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
      .map((e) => {
        // Связь окрашена в цвет узла, в который она входит.
        const color =
          typeof e.style?.stroke === 'string' ? e.style.stroke : EDGE_STYLE.stroke;
        // При выбранном узле его входящие и исходящие связи выделяются,
        // остальные приглушаются, чтобы фокус был на выбранном навыке.
        const isConnected =
          hasSelection && (e.source === selectedId || e.target === selectedId);
        const isDimmed = hasSelection && !isConnected;
        const markerSize = isConnected
          ? EDGE_ACTIVE_MARKER_SIZE
          : EDGE_MARKER_SIZE;
        return {
          ...e,
          type: 'default',
          animated: false,
          zIndex: isConnected ? 1000 : 0,
          className: isDimmed
            ? 'skill-edge skill-edge-dimmed'
            : 'skill-edge',
          style: {
            ...EDGE_STYLE,
            ...(e.style ?? {}),
            stroke: color,
            strokeWidth: isConnected
              ? EDGE_ACTIVE_STROKE_WIDTH
              : EDGE_STYLE.strokeWidth,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: markerSize,
            height: markerSize,
            color,
          },
        };
      });
  }, [initialEdges, visibleNodeIds, selectedId]);

  const onSelectionChange = useCallback(
    ({ nodes: selected }: OnSelectionChangeParams) => {
      if (selected.length === 0) return;
      onSelect(selected[0].id);
    },
    [onSelect]
  );

  const onNodeClick = useCallback(
    (_: ReactMouseEvent, node: Node) => {
      onSelect(node.id);
    },
    [onSelect]
  );

  const onPaneClick = useCallback(() => {
    onSelect(null);
  }, [onSelect]);

  // После перетаскивания запоминаем позиции всех узлов — это шаг истории.
  const onNodeDragStop = useCallback(
    (_: unknown, __: Node<SkillMapNodeData>, all: Node<SkillMapNodeData>[]) => {
      const next: NodePositions = {};
      for (const node of all) next[node.id] = { ...node.position };
      onMove(next);
    },
    [onMove]
  );

  // Ctrl+Z / Ctrl+Y — отмена и повтор действий на карте.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey && canUndo) {
        event.preventDefault();
        onUndo();
      } else if (key === 'y' && canRedo) {
        event.preventDefault();
        onRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canRedo, canUndo, onRedo, onUndo]);

  // Средняя кнопка («колесо») панорамирует карту, но браузер параллельно
  // запускает нативный автоскролл ближайшего скролл-контейнера. Capture-фаза
  // обязательна: d3-drag делает stopImmediatePropagation() на mousedown, и
  // обычный onMouseDown до React уже не доходит.
  const stopMiddleButtonScroll = useCallback((event: ReactMouseEvent) => {
    if (event.button === 1) event.preventDefault();
  }, []);

  if (nodes.length === 0) {
    return (
      <div className="flex h-[520px] w-full items-center justify-center rounded-2xl border border-dashed border-border bg-[#F8F9FC] text-helper text-secondary">
        Навыков пока нет
      </div>
    );
  }

  return (
    <div
      className="relative h-[560px] w-full rounded-2xl border border-border bg-[#F8F9FC]"
      onMouseDownCapture={stopMiddleButtonScroll}
    >
      <ReactFlow
        nodes={visibleNodes}
        edges={visibleEdges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        onSelectionChange={onSelectionChange}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 0.9 }}
        minZoom={0.3}
        maxZoom={1.5}
        connectionLineType={ConnectionLineType.Bezier}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        defaultEdgeOptions={{ type: 'default', style: EDGE_STYLE }}
      >
        <Background gap={20} size={1} color="#E3E7F0" />
        <Controls
          showInteractive={false}
          className="!overflow-hidden !rounded-xl !border !border-border !bg-surface !shadow-soft"
        />
        <MiniMap
          nodeStrokeWidth={2}
          className="!overflow-hidden !rounded-xl !border !border-border !bg-surface"
          maskColor="rgba(246,247,251,0.7)"
        />
      </ReactFlow>

      <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-xl border border-border bg-surface p-1 shadow-soft">
        <HistoryButton
          label="Отменить"
          shortcut="Ctrl+Z"
          direction="undo"
          disabled={!canUndo}
          onClick={onUndo}
        />
        <HistoryButton
          label="Вернуть"
          shortcut="Ctrl+Y"
          direction="redo"
          disabled={!canRedo}
          onClick={onRedo}
        />
      </div>
    </div>
  );
}
