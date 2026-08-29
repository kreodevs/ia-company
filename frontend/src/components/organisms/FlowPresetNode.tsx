import type { NodeProps } from '@xyflow/react'
import {
  Clock,
  GitBranch,
  GitFork,
  Globe,
  Layers,
  Play,
  Repeat,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { FlowNodeData, FlowSemanticType } from './flowEditorTypes'
import { resolveFlowIcon } from './flowEditorIcons'
import { summarizeNodeParams } from './flowEditorUtils'
import { summarizeRunAgentNodeIO } from '@/lib/flowStepIO'
import { FlowNodeShell } from './FlowNodeShell'
import { useFlowEditorContext, useFlowNodePreset } from './flowEditorContext'

const SEMANTIC_ICONS: Partial<Record<FlowSemanticType, LucideIcon>> = {
  trigger: Zap,
  condition: GitFork,
  wait: Clock,
  parallel: Layers,
  merge: GitBranch,
  loop: Repeat,
  webhook: Globe,
  subflow: GitBranch,
}

function FlowPresetNodeInner({ id, data, selected, semanticType }: NodeProps & { semanticType: FlowSemanticType }) {
  const nodeData = data as unknown as FlowNodeData
  const ctx = useFlowEditorContext()
  const preset = useFlowNodePreset(semanticType)
  const action = nodeData.action
  const Icon =
    semanticType === 'action'
      ? resolveFlowIcon(action, nodeData.icon, ctx?.actionIcons)
      : (SEMANTIC_ICONS[semanticType] ?? Play)

  const paramPreview =
    action === 'run_agent'
      ? summarizeRunAgentNodeIO(nodeData.params)
      : summarizeNodeParams(nodeData.params, semanticType === 'condition' ? 3 : 2)
  const executeLabel = preset.executeLabel ?? ctx?.i18n.executeLabels?.[semanticType] ?? 'Test'

  const sourceHandles = preset.sourceHandles?.map((handle) => ({
    id: handle.id,
    label: handle.label,
    leftPercent: handle.position ?? 50,
    color: handle.color,
  }))

  return (
    <FlowNodeShell
      id={id}
      selected={selected}
      variant={preset.variant ?? 'success'}
      dashed={preset.dashed}
      icon={<Icon className="h-3.5 w-3.5" />}
      label={nodeData.label}
      executeLabel={executeLabel}
      dispatchable={nodeData.dispatchable !== false}
      executionStatus={nodeData.executionStatus}
      showTargetHandle={preset.showTargetHandle ?? semanticType !== 'trigger'}
      showSourceHandle={preset.showSourceHandle ?? !sourceHandles?.length}
      sourceHandles={sourceHandles}
      footer={
        preset.footerLabels?.length ? (
          <div className="mt-[var(--spacing-xs)] flex justify-between text-[9px] font-normal opacity-60">
            {preset.footerLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        ) : undefined
      }
    >
      {action && (
        <div className="mt-[var(--spacing-xs)] font-mono text-[9px] font-normal opacity-80">{action}</div>
      )}
      {paramPreview.length > 0 ? (
        <div className="mt-[var(--spacing-xs)] space-y-[1px] text-[9px] font-normal opacity-70">
          {paramPreview.map((line) => (
            <div key={line} className="truncate">
              {line}
            </div>
          ))}
        </div>
      ) : (
        Boolean(nodeData.description) && (
          <div className="mt-[var(--spacing-xs)] text-[10px] font-normal opacity-70">{nodeData.description}</div>
        )
      )}
    </FlowNodeShell>
  )
}

export function createFlowPresetNode(semanticType: FlowSemanticType) {
  const Component = (props: NodeProps) => (
    <FlowPresetNodeInner {...props} semanticType={semanticType} />
  )
  Component.displayName = `Flow${semanticType.charAt(0).toUpperCase()}${semanticType.slice(1)}Node`
  return Component
}

export const FlowTriggerNode = createFlowPresetNode('trigger')
export const FlowActionNode = createFlowPresetNode('action')
export const FlowConditionNode = createFlowPresetNode('condition')
export const FlowWaitNode = createFlowPresetNode('wait')
export const FlowParallelNode = createFlowPresetNode('parallel')
export const FlowMergeNode = createFlowPresetNode('merge')
export const FlowLoopNode = createFlowPresetNode('loop')
export const FlowWebhookNode = createFlowPresetNode('webhook')
export const FlowSubflowNode = createFlowPresetNode('subflow')
