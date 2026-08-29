import { Loader2, Play } from 'lucide-react'
import type { Node } from '@xyflow/react'
import { cn } from '@/lib/utils'
import type { FlowNodeExecutionStatus } from './flowEditorTypes'
import { useFlowEditorContext } from './flowEditorContext'

export function FlowNodeExecutionBadge({ status }: { status?: FlowNodeExecutionStatus }) {
  if (!status || status === 'idle' || status === 'running') return null
  return (
    <span
      className={cn(
        'rounded-full px-[var(--spacing-xs)] py-[1px] text-[8px] font-semibold uppercase tracking-wide',
        status === 'success' && 'bg-[var(--success)]/20 text-[var(--success)]',
        status === 'error' && 'bg-[var(--destructive)]/20 text-[var(--destructive)]',
      )}
    >
      {status === 'success' ? 'OK' : 'Error'}
    </span>
  )
}

export function FlowNodeExecuteButton({
  node,
  dispatchable = true,
  label = 'Probar',
  className,
}: {
  node: Pick<Node, 'id'>
  dispatchable?: boolean
  label?: string
  className?: string
}) {
  const ctx = useFlowEditorContext()
  if (!ctx?.canExecute || ctx.readOnly || !dispatchable) return null

  const running = ctx.executingNodeId === node.id

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={running}
      onClick={(event) => {
        event.stopPropagation()
        ctx.requestExecuteNode(node)
      }}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center rounded-full border border-current/20 bg-[var(--background)]/20 p-[2px] transition-colors hover:bg-[var(--background)]/40 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {running ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Play className="h-3 w-3 fill-current" />
      )}
    </button>
  )
}
