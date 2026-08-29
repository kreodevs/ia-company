import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type IsValidConnection,
  type Node,
  type NodeChange,
  type NodeMouseHandler,
} from '@xyflow/react'
import { LayoutGrid, Play, Redo2, Search, Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/atoms/Button'
import { InputText } from '@/components/atoms/InputText'
import { FlowCanvas, FLOW_DRAG_DATA_KEY } from './FlowCanvas'
import { FlowConfigPanel } from './FlowConfigPanel'
import { FlowEditorFloatingPalette } from './FlowEditorFloatingPalette'
import { FlowEditorProvider } from './flowEditorContext'
import { FlowExecutionTrace } from './FlowExecutionTrace'
import { getNodeTypePreset } from './flowEditorDefaults'
import type {
  FlowEditorProps,
  FlowExecutionStep,
  FlowNodeData,
  FlowNodeExecuteResult,
  FlowPaletteItem,
  FlowTriggerVariable,
} from './flowEditorTypes'
import { runFlowValidation } from './flowEditorValidators'
import {
  autoLayoutFlowGraph,
  buildDefaultParams,
  buildFlowNodeExecutePayload,
  duplicateFlowNode,
  flattenPalette,
  getConditionEdgeLabel,
  getFlowConfigFields,
  isFlowNodeDispatchable,
  isFlowTriggerNode,
  isValidFlowConnection,
  normalizeFlowNodes,
  toFlowGraphPayload,
  walkFlowExecution,
} from './flowEditorUtils'
import { resolveFlowEditorConfig } from '@/presets/genericWorkflowPreset'

function FlowEditorInner({
  nodes: initialNodes,
  edges: initialEdges,
  onChange,
  onExecuteNode,
  onExecuteWorkflow,
  triggerType,
  readOnly = false,
  height = 450,
  className,
  preset,
  palette: paletteProp,
  triggerVariables: triggerVariablesProp,
  actionConfigFields: actionConfigFieldsProp,
  connectionRules: connectionRulesProp,
  dataSources,
  nodeTypes,
  i18n: i18nProp,
  showExecutionTrace = true,
  paletteVariant = 'floating',
}: FlowEditorProps) {
  const config = useMemo(
    () =>
      resolveFlowEditorConfig(preset, {
        palette: paletteProp,
        triggerVariables: triggerVariablesProp,
        actionConfigFields: actionConfigFieldsProp,
        connectionRules: connectionRulesProp,
        i18n: i18nProp,
      }),
    [preset, paletteProp, triggerVariablesProp, actionConfigFieldsProp, connectionRulesProp, i18nProp],
  )

  const paletteGroups = config.palette
  const paletteFlat = useMemo(() => flattenPalette(paletteGroups), [paletteGroups])
  const triggerVariablesMap = config.triggerVariables
  const actionConfigFields = config.actionConfigFields
  const connectionRules = config.connectionRules
  const i18n = config.i18n

  const initialNormalized = useMemo(
    () =>
      normalizeFlowNodes(initialNodes, {
        triggerType,
        palette: paletteFlat,
        triggerVariables: triggerVariablesMap,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo init
    [],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNormalized)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges ?? [])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [executingNodeId, setExecutingNodeId] = useState<string | null>(null)
  const [executingWorkflow, setExecutingWorkflow] = useState(false)
  const [activeTraceNodeId, setActiveTraceNodeId] = useState<string | null>(null)
  const [executionTrace, setExecutionTrace] = useState<FlowExecutionStep[]>([])
  const [paletteSearch, setPaletteSearch] = useState('')
  const [historyPast, setHistoryPast] = useState<Array<{ nodes: Node[]; edges: Edge[] }>>([])
  const [historyFuture, setHistoryFuture] = useState<Array<{ nodes: Node[]; edges: Edge[] }>>([])

  const onChangeRef = useRef(onChange)
  const onExecuteNodeRef = useRef(onExecuteNode)
  const onExecuteWorkflowRef = useRef(onExecuteWorkflow)
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const skipNotifyRef = useRef(true)
  const containerRef = useRef<HTMLDivElement>(null)

  onChangeRef.current = onChange
  onExecuteNodeRef.current = onExecuteNode
  onExecuteWorkflowRef.current = onExecuteWorkflow
  nodesRef.current = nodes
  edgesRef.current = edges

  const externalSyncKey = useMemo(
    () => JSON.stringify({ nodes: initialNodes, edges: initialEdges, triggerType }),
    [initialNodes, initialEdges, triggerType],
  )
  const lastExternalKeyRef = useRef(externalSyncKey)

  useEffect(() => {
    if (lastExternalKeyRef.current === externalSyncKey) return
    lastExternalKeyRef.current = externalSyncKey
    skipNotifyRef.current = true
    setNodes(
      normalizeFlowNodes(initialNodes, {
        triggerType,
        palette: paletteFlat,
        triggerVariables: triggerVariablesMap,
      }),
    )
    setEdges(initialEdges ?? [])
    setSelectedNodeId(null)
    setHistoryPast([])
    setHistoryFuture([])
  }, [externalSyncKey, initialNodes, initialEdges, triggerType, paletteFlat, triggerVariablesMap, setNodes, setEdges])

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null

  const validation = useMemo(
    () => runFlowValidation(nodes, edges, config.validators, connectionRules, i18n),
    [nodes, edges, config.validators, connectionRules, i18n],
  )

  const skippedTraceIds = useMemo(
    () => new Set(executionTrace.filter((s) => s.skipped).map((s) => s.nodeId)),
    [executionTrace],
  )

  const triggerVariables: FlowTriggerVariable[] = useMemo(() => {
    const triggerNode = nodes.find((n) => isFlowTriggerNode(n))
    if (!triggerNode) return []
    const fromNode = (triggerNode.data as Record<string, unknown>)?.triggerVariables as
      | FlowTriggerVariable[]
      | undefined
    const action = (triggerNode.data as Record<string, unknown>)?.action as string | undefined
    return fromNode ?? triggerVariablesMap[action ?? ''] ?? []
  }, [nodes, triggerVariablesMap])

  const filteredPaletteGroups = useMemo(() => {
    const q = paletteSearch.trim().toLowerCase()
    if (!q) return paletteGroups
    return paletteGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const haystack = [
            item.label,
            item.description,
            'action' in item ? item.action ?? '' : '',
          ].join(' ').toLowerCase()
          return haystack.includes(q)
        }),
      }))
      .filter((group) => group.items.length > 0)
  }, [paletteGroups, paletteSearch])

  const pushHistory = useCallback(() => {
    setHistoryPast((past) => [...past.slice(-49), { nodes: nodesRef.current, edges: edgesRef.current }])
    setHistoryFuture([])
  }, [])

  useEffect(() => {
    if (skipNotifyRef.current) {
      skipNotifyRef.current = false
      return
    }
    onChangeRef.current?.(nodes, edges)
  }, [nodes, edges])

  const checkValidConnection = useCallback<IsValidConnection<Edge>>(
    (connection) => isValidFlowConnection(connection as Connection, nodesRef.current, connectionRules),
    [connectionRules],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!checkValidConnection(connection)) return
      if (!connection.source || !connection.target) return
      pushHistory()
      setEdges((eds) => {
        if (eds.some((e) => e.source === connection.source && e.target === connection.target && e.sourceHandle === connection.sourceHandle)) {
          return eds
        }
        const label = getConditionEdgeLabel(connection.sourceHandle, i18n)
        const edge: Edge = {
          id: `e-${connection.source}-${connection.target}-${Date.now()}`,
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle ?? undefined,
          targetHandle: connection.targetHandle ?? undefined,
          type: 'smoothstep',
          animated: true,
          label,
          style: { stroke: 'var(--primary)', strokeWidth: 2 },
        }
        return [...eds, edge]
      })
    },
    [checkValidConnection, pushHistory, setEdges],
  )

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      setSelectedNodeId((prev) => {
        const next = prev === node.id ? null : node.id
        setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === next })))
        return next
      })
    },
    [setNodes],
  )

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null)
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })))
  }, [setNodes])

  const deleteNode = useCallback(
    (nodeId: string) => {
      pushHistory()
      setNodes((nds) => {
        const target = nds.find((n) => n.id === nodeId)
        if (!target || isFlowTriggerNode(target)) return nds
        setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
        setSelectedNodeId(null)
        return nds.filter((n) => n.id !== nodeId)
      })
    },
    [pushHistory, setNodes, setEdges],
  )

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const hasPositionChange = changes.some((c) => c.type === 'position' && c.dragging)
      const hasRemove = changes.some((c) => c.type === 'remove')
      if (hasPositionChange && !hasRemove) {
        // history on drag end handled below via position change with dragging false
      }

      const removeIds = changes
        .filter((change) => change.type === 'remove')
        .map((change) => change.id)

      const blockedRemoves = new Set(
        removeIds.filter((id) => {
          const target = nodes.find((n) => n.id === id)
          return target && isFlowTriggerNode(target)
        }),
      )

      const allowedRemoves = removeIds.filter((id) => !blockedRemoves.has(id))
      if (allowedRemoves.length > 0) pushHistory()
      if (allowedRemoves.some((id) => id === selectedNodeId)) {
        setSelectedNodeId(null)
      }
      if (allowedRemoves.length > 0) {
        setEdges((eds) =>
          allowedRemoves.reduce(
            (acc, id) => acc.filter((e) => e.source !== id && e.target !== id),
            eds,
          ),
        )
      }

      const positionEnded = changes.find((c) => c.type === 'position' && c.dragging === false)
      if (positionEnded) pushHistory()

      onNodesChange(changes.filter((change) => change.type !== 'remove' || !blockedRemoves.has(change.id)))
    },
    [nodes, onNodesChange, selectedNodeId, setEdges, pushHistory],
  )

  const addNodeAt = useCallback(
    (item: FlowPaletteItem, position?: { x: number; y: number }) => {
      if (item.semanticType === 'trigger') return
      pushHistory()
      const id = `node-${Date.now()}`
      const configFields = getFlowConfigFields(actionConfigFields, item.semanticType, item.action)
      const newNode: Node = {
        id,
        type: item.semanticType,
        deletable: true,
        position: position ?? { x: 200 + Math.random() * 250, y: 150 + Math.random() * 200 },
        data: {
          label: item.label,
          semanticType: item.semanticType,
          action: item.action,
          params: buildDefaultParams(configFields),
          description: item.description,
          dispatchable: true,
          icon: item.icon,
        },
      }
      setNodes((nds) => [...nds, newNode])
    },
    [actionConfigFields, pushHistory, setNodes],
  )

  const addNode = useCallback((item: FlowPaletteItem) => addNodeAt(item), [addNodeAt])

  const handleDropNode = useCallback(
    (raw: string, position: { x: number; y: number }) => {
      try {
        const item = JSON.parse(raw) as FlowPaletteItem
        addNodeAt(item, position)
      } catch {
        // ignore invalid drop
      }
    },
    [addNodeAt],
  )

  const updateParam = useCallback(
    (key: string, value: string | number | boolean) => {
      if (!selectedNodeId || readOnly) return
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== selectedNodeId) return n
          const data = n.data as Record<string, unknown>
          return {
            ...n,
            data: {
              ...data,
              params: { ...((data.params as Record<string, unknown>) ?? {}), [key]: value },
            },
          }
        }),
      )
    },
    [readOnly, selectedNodeId, setNodes],
  )

  const patchNodeData = useCallback(
    (nodeId: string, patch: Partial<FlowNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)),
      )
    },
    [setNodes],
  )

  const requestExecuteNode = useCallback(
    async (target: Pick<Node, 'id'>) => {
      const handler = onExecuteNodeRef.current
      if (!handler || readOnly) return

      const node = nodesRef.current.find((n) => n.id === target.id)
      if (!node || !isFlowNodeDispatchable(node)) return

      setExecutingNodeId(node.id)
      patchNodeData(node.id, { executionStatus: 'running', executionMessage: undefined })

      try {
        const payload = buildFlowNodeExecutePayload(node, nodesRef.current)
        const result = (await handler(payload)) as FlowNodeExecuteResult | void
        patchNodeData(node.id, {
          executionStatus: result?.success === false ? 'error' : 'success',
          executionMessage: result?.message,
        })
      } catch (error) {
        patchNodeData(node.id, {
          executionStatus: 'error',
          executionMessage: error instanceof Error ? error.message : 'Error al ejecutar',
        })
      } finally {
        setExecutingNodeId(null)
      }
    },
    [patchNodeData, readOnly],
  )

  const handleExecuteWorkflow = useCallback(async () => {
    const handler = onExecuteWorkflowRef.current
    if (!handler || readOnly) return
    setExecutingWorkflow(true)
    setExecutionTrace([])
    setActiveTraceNodeId(null)

    const currentNodes = nodesRef.current
    const currentEdges = edgesRef.current

    try {
      const steps = await walkFlowExecution(
        currentNodes,
        currentEdges,
        onExecuteNodeRef.current
          ? async (payload) => {
              setActiveTraceNodeId(payload.nodeId)
              patchNodeData(payload.nodeId, { executionStatus: 'running' })
              const result = (await onExecuteNodeRef.current!(payload)) as FlowNodeExecuteResult | void
              patchNodeData(payload.nodeId, {
                executionStatus: result?.success === false ? 'error' : 'success',
                executionMessage: result?.message,
              })
              setExecutionTrace((prev) => [...prev])
              return result
            }
          : undefined,
        { i18n },
      )
      setExecutionTrace(steps)

      const triggerNode = currentNodes.find((n) => isFlowTriggerNode(n))
      await handler(
        toFlowGraphPayload(
          currentNodes,
          currentEdges,
          (triggerNode?.data as Record<string, unknown> | undefined)?.action as string | undefined,
        ),
      )
    } finally {
      setExecutingWorkflow(false)
      setActiveTraceNodeId(null)
    }
  }, [i18n, patchNodeData, readOnly])

  const handleAutoLayout = useCallback(() => {
    pushHistory()
    setNodes((nds) => autoLayoutFlowGraph(nds, edgesRef.current))
  }, [pushHistory, setNodes])

  const handleUndo = useCallback(() => {
    setHistoryPast((past) => {
      if (past.length === 0) return past
      const prev = past[past.length - 1]
      setHistoryFuture((future) => [{ nodes: nodesRef.current, edges: edgesRef.current }, ...future])
      skipNotifyRef.current = false
      setNodes(prev.nodes)
      setEdges(prev.edges)
      return past.slice(0, -1)
    })
  }, [setNodes, setEdges])

  const handleRedo = useCallback(() => {
    setHistoryFuture((future) => {
      if (future.length === 0) return future
      const next = future[0]
      setHistoryPast((past) => [...past, { nodes: nodesRef.current, edges: edgesRef.current }])
      skipNotifyRef.current = false
      setNodes(next.nodes)
      setEdges(next.edges)
      return future.slice(1)
    })
  }, [setNodes, setEdges])

  const handleDuplicate = useCallback(() => {
    if (!selectedNodeId || readOnly) return
    const node = nodes.find((n) => n.id === selectedNodeId)
    if (!node || isFlowTriggerNode(node)) return
    pushHistory()
    const copy = duplicateFlowNode(node)
    setNodes((nds) => [...nds, copy])
    setSelectedNodeId(copy.id)
  }, [nodes, pushHistory, readOnly, selectedNodeId, setNodes])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (readOnly) return
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return

      if (event.key === 'Escape') {
        clearSelection()
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        handleUndo()
      }
      if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        event.preventDefault()
        handleRedo()
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'd' && selectedNodeId) {
        event.preventDefault()
        handleDuplicate()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [clearSelection, handleDuplicate, handleRedo, handleUndo, readOnly, selectedNodeId])

  const flowContextValue = useMemo(
    () => ({
      readOnly,
      executingNodeId,
      canExecute: Boolean(onExecuteNode) && !readOnly,
      requestExecuteNode: (node: Pick<Node, 'id'>) => {
        void requestExecuteNode(node)
      },
      buildExecutePayload: (nodeId: string) => {
        const node = nodesRef.current.find((n) => n.id === nodeId)
        return node ? buildFlowNodeExecutePayload(node, nodesRef.current) : null
      },
      i18n,
      nodeTypes: config.nodeTypes,
      actionIcons: config.actionIcons,
      getNodePreset: (semanticType: FlowNodeData['semanticType']) =>
        getNodeTypePreset(config.nodeTypes, semanticType),
    }),
    [config.actionIcons, config.nodeTypes, executingNodeId, i18n, onExecuteNode, readOnly, requestExecuteNode],
  )

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]',
        className,
      )}
    >
      {!readOnly && (
        <div className="space-y-[var(--spacing-sm)] border-b border-[var(--border)] bg-[var(--secondary)] px-[var(--spacing-md)] py-[var(--spacing-sm)]">
          <div className="flex flex-wrap items-center justify-between gap-[var(--spacing-sm)]">
            <div className="flex flex-wrap items-center gap-[var(--spacing-xs)]">
              {paletteVariant === 'header' && (
                <div className="relative min-w-[140px] max-w-[220px] flex-1">
                  <Search className="pointer-events-none absolute left-[var(--spacing-sm)] top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-muted)]" />
                  <InputText
                    value={paletteSearch}
                    onChange={(e) => setPaletteSearch(e.target.value)}
                    placeholder={i18n.searchPlaceholder}
                    className="h-8 pl-8 text-xs"
                    fullWidth
                    aria-label="Buscar en palette"
                  />
                </div>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={handleUndo} disabled={historyPast.length === 0} title="Deshacer (Ctrl+Z)">
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleRedo} disabled={historyFuture.length === 0} title="Rehacer (Ctrl+Shift+Z)">
                <Redo2 className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleAutoLayout} title="Organizar grafo">
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex shrink-0 flex-col gap-[var(--spacing-xs)]">
              {onExecuteWorkflow && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={executingWorkflow || !validation.valid}
                  onClick={() => void handleExecuteWorkflow()}
                >
                  <Play className="h-4 w-4" />
                  {executingWorkflow ? i18n.executingWorkflow : i18n.executeWorkflow}
                </Button>
              )}
            </div>
          </div>

          {paletteVariant === 'header' && (
            <>
              {filteredPaletteGroups.map((group) => (
                <div key={group.type} className="flex flex-wrap items-center gap-[var(--spacing-xs)]">
                  <span className="min-w-[80px] text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                    {group.title}
                  </span>
                  {group.items.map((item) => (
                    <button
                      key={`${group.type}-${item.label}`}
                      type="button"
                      draggable={item.semanticType !== 'trigger'}
                      onDragStart={(event) => {
                        event.dataTransfer.setData(FLOW_DRAG_DATA_KEY, JSON.stringify(item))
                        event.dataTransfer.effectAllowed = 'move'
                      }}
                      onClick={() => addNode(item)}
                      title={`${item.description} — arrastra al canvas o clic para añadir`}
                      disabled={item.semanticType === 'trigger'}
                      className="cursor-grab whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--background)] px-[var(--spacing-sm)] py-[var(--spacing-xs)] text-[11px] text-[var(--foreground)] transition-all duration-[var(--transition-base)] hover:-translate-y-0.5 hover:border-[var(--primary)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:hover:translate-y-0"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ))}

              <p className="text-[10px] text-[var(--foreground-muted)]">{i18n.paletteHint}</p>
            </>
          )}

          {validation.issues.length > 0 && (
            <div className="space-y-[var(--spacing-xs)]" role="alert">
              {validation.issues.map((issue) => (
                <p
                  key={`${issue.code}-${issue.nodeId ?? issue.edgeId ?? issue.message}`}
                  className={cn(
                    'rounded-[var(--radius-sm)] px-[var(--spacing-sm)] py-[var(--spacing-xs)] text-[10px]',
                    issue.severity === 'error'
                      ? 'bg-[var(--destructive)]/10 text-[var(--destructive)]'
                      : 'bg-[var(--warning)]/10 text-[var(--warning)]',
                  )}
                >
                  {issue.message}
                </p>
              ))}
            </div>
          )}

          {showExecutionTrace && executionTrace.length > 0 && (
            <FlowExecutionTrace steps={executionTrace} i18n={i18n} />
          )}
        </div>
      )}

      <FlowEditorProvider value={flowContextValue}>
        <div className="flex min-h-0">
          <div
            className="relative min-w-0 transition-[width] duration-[var(--transition-base)]"
            style={{ width: selectedNode ? '65%' : '100%' }}
          >
            <FlowCanvas
              nodes={nodes}
              edges={edges}
              readOnly={readOnly}
              height={height}
              nodeTypes={nodeTypes}
              onNodesChange={handleNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onPaneClick={clearSelection}
              onDropNode={readOnly ? undefined : handleDropNode}
              isValidConnection={checkValidConnection}
              activeNodeId={activeTraceNodeId}
              skippedNodeIds={skippedTraceIds}
            />
            {!readOnly && paletteVariant === 'floating' && (
              <FlowEditorFloatingPalette
                groups={filteredPaletteGroups}
                search={paletteSearch}
                onSearchChange={setPaletteSearch}
                onAdd={addNode}
                actionIcons={config.actionIcons}
                i18n={i18n}
              />
            )}
          </div>

          {selectedNode && (
            <FlowConfigPanel
              node={selectedNode}
              nodes={nodes}
              edges={edges}
              actionConfigFields={actionConfigFields}
              triggerVariables={triggerVariables}
              dataSources={dataSources}
              i18n={i18n}
              onUpdateParam={updateParam}
              onClose={clearSelection}
              readOnly={readOnly}
              executing={executingNodeId === selectedNode.id}
              onExecute={
                onExecuteNode && !readOnly && isFlowNodeDispatchable(selectedNode)
                  ? () => void requestExecuteNode(selectedNode)
                  : undefined
              }
              onDelete={
                !readOnly && !isFlowTriggerNode(selectedNode)
                  ? () => deleteNode(selectedNode.id)
                  : undefined
              }
              onDuplicate={!readOnly && !isFlowTriggerNode(selectedNode) ? handleDuplicate : undefined}
              className="w-[35%] min-w-[280px]"
            />
          )}
        </div>
      </FlowEditorProvider>
    </div>
  )
}

export const FlowEditor = forwardRef<HTMLDivElement, FlowEditorProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('w-full', className)}>
      <ReactFlowProvider>
        <FlowEditorInner {...props} />
      </ReactFlowProvider>
    </div>
  ),
)

FlowEditor.displayName = 'FlowEditor'

export default FlowEditor

export { normalizeFlowNodes } from './flowEditorUtils'
export type {
  FlowEditorProps,
  FlowEditorPreset,
  FlowPaletteGroup,
  FlowPaletteItem,
  FlowConfigField,
  FlowConnectionRules,
  FlowDataSources,
  FlowDataSourceOption,
  FlowGraphPayload,
  FlowGraphValidationResult,
  FlowGraphValidator,
  FlowGraphValidatorContext,
  FlowHandleDefinition,
  FlowI18n,
  FlowNodeData,
  FlowNodeExecutePayload,
  FlowNodeExecuteResult,
  FlowNodeExecutionStatus,
  FlowNodeTypePreset,
  FlowSemanticType,
  FlowTriggerVariable,
  FlowValidationIssue,
  FlowExecutionStep,
  ResolvedFlowEditorConfig,
} from './flowEditorTypes'
export { useFlowEditorContext } from './flowEditorContext'
export { GENERIC_FLOW_PRESET, resolveFlowEditorConfig } from '@/presets/genericWorkflowPreset'
export {
  autoLayoutFlowGraph,
  buildDefaultParams,
  buildFlowNodeExecutePayload,
  duplicateFlowNode,
  isValidFlowConnection,
  summarizeNodeParams,
  walkFlowExecution,
} from './flowEditorUtils'
export { runFlowValidation, validateFlowGraph } from './flowEditorValidators'
