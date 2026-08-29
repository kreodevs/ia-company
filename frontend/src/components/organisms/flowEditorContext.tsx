import { createContext, useContext, type ReactNode } from 'react'
import type { Node } from '@xyflow/react'
import type {
  FlowI18n,
  FlowNodeExecutePayload,
  FlowNodeTypePreset,
  FlowSemanticType,
  ResolvedFlowEditorConfig,
} from './flowEditorTypes'
import { getNodeTypePreset } from './flowEditorDefaults'

export interface FlowEditorContextValue {
  readOnly: boolean
  executingNodeId: string | null
  canExecute: boolean
  requestExecuteNode: (node: Pick<Node, 'id'>) => void
  buildExecutePayload: (nodeId: string) => FlowNodeExecutePayload | null
  i18n: FlowI18n
  nodeTypes: ResolvedFlowEditorConfig['nodeTypes']
  actionIcons: Record<string, string>
  getNodePreset: (semanticType: FlowSemanticType) => FlowNodeTypePreset
}

const FlowEditorContext = createContext<FlowEditorContextValue | null>(null)

export function FlowEditorProvider({
  value,
  children,
}: {
  value: FlowEditorContextValue
  children: ReactNode
}) {
  return <FlowEditorContext.Provider value={value}>{children}</FlowEditorContext.Provider>
}

export function useFlowEditorContext(): FlowEditorContextValue | null {
  return useContext(FlowEditorContext)
}

export function useFlowNodePreset(semanticType: FlowSemanticType): FlowNodeTypePreset {
  const ctx = useFlowEditorContext()
  return ctx ? ctx.getNodePreset(semanticType) : getNodeTypePreset({}, semanticType)
}
