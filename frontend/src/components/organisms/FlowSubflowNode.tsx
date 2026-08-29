import type { NodeProps } from '@xyflow/react'
import { GitBranch } from 'lucide-react'
import type { FlowNodeData } from './flowEditorTypes'
import { summarizeNodeParams } from './flowEditorUtils'
import { FlowNodeShell } from './FlowNodeShell'

export function FlowSubflowNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as FlowNodeData
  const paramPreview = summarizeNodeParams(nodeData.params, 2)

  return (
    <FlowNodeShell
      id={id}
      selected={selected}
      variant="muted"
      icon={<GitBranch className="h-3.5 w-3.5" />}
      label={nodeData.label}
      executeLabel="Probar subflujo"
      dispatchable={nodeData.dispatchable !== false}
      executionStatus={nodeData.executionStatus}
    >
      {paramPreview.length > 0 && (
        <div className="mt-[var(--spacing-xs)] space-y-[1px] text-[9px] font-normal opacity-70">
          {paramPreview.map((line) => (
            <div key={line} className="truncate">
              {line}
            </div>
          ))}
        </div>
      )}
    </FlowNodeShell>
  )
}

FlowSubflowNode.displayName = 'FlowSubflowNode'
export default FlowSubflowNode
