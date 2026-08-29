import { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Connection,
  type Edge,
  type IsValidConnection,
  type Node,
  type NodeMouseHandler,
  type NodeTypes,
  type OnEdgesChange,
  type OnNodesChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import '@/theme/flow-editor.css'
import { cn } from '@/lib/utils'
import {
  FlowActionNode,
  FlowConditionNode,
  FlowLoopNode,
  FlowMergeNode,
  FlowParallelNode,
  FlowSubflowNode,
  FlowTriggerNode,
  FlowWaitNode,
  FlowWebhookNode,
} from './FlowPresetNode'

export const DEFAULT_FLOW_NODE_TYPES: NodeTypes = {
  trigger: FlowTriggerNode,
  action: FlowActionNode,
  condition: FlowConditionNode,
  wait: FlowWaitNode,
  parallel: FlowParallelNode,
  merge: FlowMergeNode,
  loop: FlowLoopNode,
  webhook: FlowWebhookNode,
  subflow: FlowSubflowNode,
}

export const FLOW_DRAG_DATA_KEY = 'application/reactflow-kreo'

export interface FlowCanvasProps {
  nodes: Node[]
  edges: Edge[]
  readOnly?: boolean
  height?: number | string
  className?: string
  nodeTypes?: NodeTypes
  onNodesChange?: OnNodesChange
  onEdgesChange?: OnEdgesChange
  onConnect?: (connection: Connection) => void
  onNodeClick?: NodeMouseHandler
  onPaneClick?: () => void
  onDropNode?: (item: string, position: { x: number; y: number }) => void
  isValidConnection?: IsValidConnection<Edge>
  activeNodeId?: string | null
  skippedNodeIds?: Set<string>
}

export function FlowCanvas({
  nodes,
  edges,
  readOnly = false,
  height = 450,
  className,
  nodeTypes,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneClick,
  onDropNode,
  isValidConnection,
  activeNodeId,
  skippedNodeIds,
}: FlowCanvasProps) {
  const resolvedNodeTypes = useMemo(
    () => ({ ...DEFAULT_FLOW_NODE_TYPES, ...nodeTypes }),
    [nodeTypes],
  )

  const highlightedNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        className: cn(
          n.className,
          activeNodeId === n.id && 'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--background)]',
          skippedNodeIds?.has(n.id) && 'opacity-40',
        ),
      })),
    [activeNodeId, nodes, skippedNodeIds],
  )

  const highlightedEdges = useMemo(
    () =>
      edges.map((e) => ({
        ...e,
        animated: activeNodeId ? e.source === activeNodeId || e.target === activeNodeId : e.animated,
        style: {
          ...e.style,
          strokeWidth: activeNodeId && (e.source === activeNodeId || e.target === activeNodeId) ? 3 : 2,
          opacity: skippedNodeIds?.has(e.target) ? 0.35 : 1,
        },
      })),
    [activeNodeId, edges, skippedNodeIds],
  )

  return (
    <div
      style={{ height }}
      className={cn('w-full', className)}
      onDragOver={(event) => {
        if (readOnly || !onDropNode) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
      }}
      onDrop={(event) => {
        if (readOnly || !onDropNode) return
        event.preventDefault()
        const raw = event.dataTransfer.getData(FLOW_DRAG_DATA_KEY)
        if (!raw) return
        const bounds = event.currentTarget.getBoundingClientRect()
        onDropNode(raw, {
          x: event.clientX - bounds.left - 80,
          y: event.clientY - bounds.top - 40,
        })
      }}
    >
      <ReactFlow
        nodes={highlightedNodes}
        edges={highlightedEdges}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        onConnect={readOnly ? undefined : onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={resolvedNodeTypes}
        isValidConnection={isValidConnection}
        fitView
        snapToGrid
        snapGrid={[20, 20]}
        deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']}
        multiSelectionKeyCode="Shift"
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        defaultEdgeOptions={{
          animated: true,
          type: 'smoothstep',
          style: { stroke: 'var(--primary)', strokeWidth: 2 },
          labelStyle: { fill: 'var(--foreground)', fontSize: 10, fontWeight: 600 },
          labelBgStyle: { fill: 'var(--background)', fillOpacity: 0.9 },
          labelBgPadding: [4, 6] as [number, number],
          labelBgBorderRadius: 4,
        }}
        aria-label="Workflow canvas"
      >
        <Background gap={20} size={1} color="var(--border)" />
        <Controls position="bottom-right" />
        <MiniMap
          position="bottom-left"
          maskColor="color-mix(in srgb, var(--background) 60%, transparent)"
          nodeColor={(node) => {
            const st = (node.data as Record<string, unknown>)?.semanticType || node.type
            if (st === 'trigger') return 'var(--primary)'
            if (st === 'condition') return 'var(--warning)'
            if (st === 'wait' || st === 'loop') return 'var(--info)'
            if (st === 'parallel' || st === 'webhook') return 'var(--accent)'
            if (st === 'merge' || st === 'subflow') return 'var(--muted-foreground)'
            return 'var(--success)'
          }}
        />
      </ReactFlow>
    </div>
  )
}

FlowCanvas.displayName = 'FlowCanvas'
export default FlowCanvas
