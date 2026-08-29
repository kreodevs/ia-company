import type { NodeProps } from '@xyflow/react'
import { Globe } from 'lucide-react'
import type { FlowNodeData } from './flowEditorTypes'
import { summarizeNodeParams } from './flowEditorUtils'
import { FlowNodeShell } from './FlowNodeShell'

export function FlowWebhookNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as FlowNodeData
  const paramPreview = summarizeNodeParams(nodeData.params, 2)

  return (
    <FlowNodeShell
      id={id}
      selected={selected}
      variant="accent"
      icon={<Globe className="h-3.5 w-3.5" />}
      label={nodeData.label}
      executeLabel="Probar webhook"
      dispatchable={nodeData.dispatchable !== false}
      executionStatus={nodeData.executionStatus}
    >
      {nodeData.action && (
        <div className="mt-[var(--spacing-xs)] font-mono text-[9px] font-normal opacity-80">{nodeData.action}</div>
      )}
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

FlowWebhookNode.displayName = 'FlowWebhookNode'
export default FlowWebhookNode
