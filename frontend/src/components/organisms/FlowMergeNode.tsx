import type { NodeProps } from '@xyflow/react'
import { GitBranch } from 'lucide-react'
import type { FlowNodeData } from './flowEditorTypes'
import { FlowNodeShell } from './FlowNodeShell'

export function FlowMergeNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as FlowNodeData
  const strategy = String(nodeData.params?.strategy ?? 'all')

  return (
    <FlowNodeShell
      id={id}
      selected={selected}
      variant="secondary"
      icon={<GitBranch className="h-3.5 w-3.5" />}
      label={nodeData.label}
      executeLabel="Probar fusión"
      dispatchable={nodeData.dispatchable !== false}
      executionStatus={nodeData.executionStatus}
    >
      <div className="mt-[var(--spacing-xs)] text-[10px] font-normal opacity-70">
        Estrategia: {strategy === 'any' ? 'Primera' : 'Todas'}
      </div>
    </FlowNodeShell>
  )
}

FlowMergeNode.displayName = 'FlowMergeNode'
export default FlowMergeNode
