import { useCallback, useMemo } from 'react'
import type { Edge, Node } from '@xyflow/react'
import { Copy, Loader2, Play, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/atoms/Button'
import { InputText } from '@/components/atoms/InputText'
import { Switch } from '@/components/atoms/Switch'
import { Textarea } from '@/components/atoms/Textarea'
import { buildRunAgentIOSummary, getUpstreamAgentNodes } from '@/lib/flowStepIO'
import { FlowExpressionBuilder } from './FlowExpressionBuilder'
import { FlowStepIOPanel } from './FlowStepIOPanel'
import type {
  FlowConfigField,
  FlowConfigFieldGroup,
  FlowDataSources,
  FlowI18n,
  FlowNodeExecutionStatus,
  FlowSemanticType,
  FlowTriggerVariable,
} from './flowEditorTypes'
import { getFlowConfigFields } from './flowEditorUtils'

export interface FlowConfigPanelProps {
  node: Node
  nodes?: Node[]
  edges?: Edge[]
  actionConfigFields?: Record<string, FlowConfigField[]>
  triggerVariables?: FlowTriggerVariable[]
  dataSources?: FlowDataSources
  i18n?: FlowI18n
  onUpdateParam: (key: string, value: string | number | boolean) => void
  onClose: () => void
  onDelete?: () => void
  onDuplicate?: () => void
  onExecute?: () => void
  executing?: boolean
  executeLabel?: string
  readOnly?: boolean
  className?: string
}

export function FlowConfigPanel({
  node,
  nodes = [],
  edges = [],
  actionConfigFields,
  triggerVariables = [],
  dataSources = {},
  i18n,
  onUpdateParam,
  onClose,
  onDelete,
  onDuplicate,
  onExecute,
  executing = false,
  executeLabel,
  readOnly = false,
  className,
}: FlowConfigPanelProps) {
  const data = node.data as Record<string, unknown>
  const semanticType = data.semanticType as FlowSemanticType | undefined
  const action = data.action as string | undefined
  const params = (data.params as Record<string, unknown>) ?? {}
  const executionStatus = data.executionStatus as FlowNodeExecutionStatus | undefined
  const executionMessage = data.executionMessage as string | undefined
  const configFields = getFlowConfigFields(actionConfigFields, semanticType, action)
  const templateFields = configFields.filter((f) => f.type === 'text' || f.type === 'textarea')
  const datasourceFields = configFields.filter((f) => f.type === 'datasource')

  const executeLabels = i18n?.executeLabels ?? {}

  const datasourceGroups = useMemo(
    () =>
      datasourceFields.map((field) => ({
        field,
        key: field.dataSourceKey ?? field.key,
        label:
          field.dataSourceLabel
          ?? i18n?.dataSourceLabels?.[field.dataSourceKey ?? field.key]
          ?? field.label,
        options: dataSources[field.dataSourceKey ?? field.key] ?? [],
      })),
    [datasourceFields, dataSources, i18n?.dataSourceLabels],
  )

  const insertVariable = useCallback(
    (varPath: string) => {
      const template = `{{${varPath}}}`
      const activeEl = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null
      const activeFieldKey = activeEl?.getAttribute('data-field-key')
      if (activeFieldKey && activeEl && 'selectionStart' in activeEl) {
        const start = activeEl.selectionStart ?? activeEl.value.length
        const end = activeEl.selectionEnd ?? start
        const newValue = activeEl.value.slice(0, start) + template + activeEl.value.slice(end)
        onUpdateParam(activeFieldKey, newValue)
        requestAnimationFrame(() => {
          const el = document.querySelector(`[data-field-key="${activeFieldKey}"]`) as HTMLInputElement | null
          if (el) {
            const pos = start + template.length
            el.focus()
            el.setSelectionRange(pos, pos)
          }
        })
        return
      }
      const first = templateFields[0]?.key
      if (first) onUpdateParam(first, String(params[first] ?? '') + template)
    },
    [onUpdateParam, params, templateFields],
  )

  const scalarFields = configFields.filter(
    (f) =>
      f.type !== 'datasource'
      && f.type !== 'boolean'
      && (semanticType !== 'condition' || !['field', 'operator', 'value'].includes(f.key)),
  )

  const booleanFields = configFields.filter((f) => f.type === 'boolean')

  const groupTitles: Record<FlowConfigFieldGroup, string> = {
    general: i18n?.configGroupGeneral ?? 'General',
    input: i18n?.configGroupInput ?? 'Ajustar entrada',
    output: i18n?.configGroupOutput ?? 'Ajustar salida',
  }

  const fieldsByGroup = useMemo(() => {
    const groups: Record<FlowConfigFieldGroup, FlowConfigField[]> = {
      general: [],
      input: [],
      output: [],
    }
    for (const field of [...scalarFields, ...booleanFields]) {
      const group = field.group ?? 'general'
      groups[group].push(field)
    }
    return groups
  }, [booleanFields, scalarFields])

  const runAgentIOSummary = useMemo(() => {
    if (action !== 'run_agent') return null
    const upstream = getUpstreamAgentNodes(node.id, nodes, edges)
    return buildRunAgentIOSummary(params, upstream, triggerVariables)
  }, [action, edges, node.id, nodes, params, triggerVariables])

  const insertVariables = useMemo(() => {
    if (action !== 'run_agent') return triggerVariables
    const upstream = getUpstreamAgentNodes(node.id, nodes, edges)
    const upstreamVars: FlowTriggerVariable[] = upstream.map((upstreamNode) => {
      const upParams = (upstreamNode.data as Record<string, unknown>).params as Record<string, unknown> | undefined
      const upAgentId = String(upParams?.agentId ?? upstreamNode.data.label ?? upstreamNode.id)
      const memoryKey = String(upParams?.memoryKey ?? '').trim() || upAgentId
      return {
        path: memoryKey,
        label: String((upstreamNode.data as Record<string, unknown>).label ?? upAgentId),
        description: 'Salida del paso anterior',
        example: memoryKey,
      }
    })
    const seen = new Set<string>()
    return [...triggerVariables, ...upstreamVars].filter((v) => {
      if (seen.has(v.path)) return false
      seen.add(v.path)
      return true
    })
  }, [action, edges, node.id, nodes, triggerVariables])

  const renderScalarField = (field: FlowConfigField) => (
    <div key={field.key} className="space-y-[var(--spacing-xs)]">
      <label className="text-[11px] font-medium text-[var(--foreground)]" htmlFor={`flow-field-${field.key}`}>
        {field.label}
      </label>
      {field.helpText ? (
        <p className="text-[9px] leading-snug text-[var(--foreground-muted)]">{field.helpText}</p>
      ) : null}
      {field.type === 'textarea' ? (
        <Textarea
          id={`flow-field-${field.key}`}
          value={String(params[field.key] ?? field.defaultValue ?? '')}
          onChange={(e) => onUpdateParam(field.key, e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          data-field-key={field.key}
          readOnly={readOnly}
          disabled={readOnly}
          className="font-mono text-xs"
        />
      ) : field.type === 'select' ? (
        <select
          id={`flow-field-${field.key}`}
          value={String(params[field.key] ?? field.defaultValue ?? '')}
          onChange={(e) => onUpdateParam(field.key, e.target.value)}
          disabled={readOnly}
          className="w-full cursor-pointer rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-[var(--spacing-sm)] py-[var(--spacing-xs)] text-xs text-[var(--foreground)] focus:border-[var(--input-focus)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-60"
        >
          <option value="">—</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <InputText
          id={`flow-field-${field.key}`}
          type={field.type === 'number' ? 'number' : 'text'}
          value={String(params[field.key] ?? field.defaultValue ?? '')}
          onChange={(e) =>
            onUpdateParam(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)
          }
          placeholder={field.placeholder}
          data-field-key={field.key}
          disabled={readOnly}
          fullWidth
        />
      )}
    </div>
  )

  const renderBooleanField = (field: FlowConfigField) => {
    const checked = params[field.key] !== undefined ? Boolean(params[field.key]) : Boolean(field.defaultValue)
    return (
      <div key={field.key} className="flex items-start justify-between gap-[var(--spacing-sm)] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)]/50 px-[var(--spacing-sm)] py-[var(--spacing-xs)]">
        <div className="min-w-0 flex-1">
          <label className="text-[11px] font-medium text-[var(--foreground)]" htmlFor={`flow-field-${field.key}`}>
            {field.label}
          </label>
          {field.helpText ? (
            <p className="mt-[1px] text-[9px] leading-snug text-[var(--foreground-muted)]">{field.helpText}</p>
          ) : null}
        </div>
        <Switch
          id={`flow-field-${field.key}`}
          checked={checked}
          onCheckedChange={(value) => onUpdateParam(field.key, value)}
          disabled={readOnly}
          aria-label={field.label}
        />
      </div>
    )
  }

  const renderFieldGroup = (group: FlowConfigFieldGroup) => {
    const fields = fieldsByGroup[group]
    if (fields.length === 0) return null

    const scalar = fields.filter((f) => f.type !== 'boolean')
    const toggles = fields.filter((f) => f.type === 'boolean')

    return (
      <div key={group} className="space-y-[var(--spacing-sm)]">
        {action === 'run_agent' && group !== 'general' ? (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
            {groupTitles[group]}
          </p>
        ) : null}
        {toggles.map(renderBooleanField)}
        {scalar.map(renderScalarField)}
        {group === 'input'
          && semanticType !== 'trigger'
          && insertVariables.length > 0
          && templateFields.some((f) => f.group === 'input' || f.key === 'customPrompt') ? (
            <div className="space-y-[var(--spacing-xs)]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                {i18n?.insertVariable ?? 'Insert variable'}
              </p>
              <div className="flex flex-wrap gap-[var(--spacing-xs)]">
                {insertVariables.map((v) => (
                  <button
                    key={v.path}
                    type="button"
                    onClick={() => insertVariable(v.path)}
                    title={`${v.label} — e.g. ${v.example ?? v.path}`}
                    className="cursor-pointer rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-[var(--spacing-sm)] py-[2px] font-mono text-[9px] text-[var(--primary)] transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/20 focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  >
                    {`{{${v.path}}}`}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'animate-[slideIn_0.15s_ease-out] space-y-[var(--spacing-md)] overflow-y-auto border-l border-[var(--border)] bg-[var(--secondary)] p-[var(--spacing-md)]',
        className,
      )}
      role="complementary"
      aria-label={i18n?.configureLabel ?? 'Node configuration panel'}
    >
      <div className="flex items-center justify-between gap-[var(--spacing-sm)]">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          {semanticType === 'trigger' ? (i18n?.triggerLabel ?? 'Trigger') : (i18n?.configureLabel ?? 'Configure')}:{' '}
          {String(data.label ?? '')}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label={i18n?.closePanel ?? 'Close panel'}
          className="cursor-pointer text-lg leading-none text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          ×
        </button>
      </div>

      {Boolean(data.description) && (
        <p className="text-[11px] text-[var(--foreground-muted)]">{String(data.description)}</p>
      )}

      {action && semanticType !== 'trigger' && (
        <p className="font-mono text-[10px] text-[var(--foreground-muted)]">
          {i18n?.handlerLabel ?? 'handler'}: <span className="text-[var(--accent)]">{action}</span>
        </p>
      )}

      {semanticType === 'trigger' && action && (
        <p className="font-mono text-[10px] text-[var(--foreground-muted)]">
          {i18n?.eventLabel ?? 'event'}: <span className="text-[var(--primary)]">{action}</span>
        </p>
      )}

      {executionStatus && executionStatus !== 'idle' && executionStatus !== 'running' && (
        <p
          className={cn(
            'rounded-[var(--radius-sm)] px-[var(--spacing-sm)] py-[var(--spacing-xs)] text-[10px]',
            executionStatus === 'success' && 'bg-[var(--success)]/10 text-[var(--success)]',
            executionStatus === 'error' && 'bg-[var(--destructive)]/10 text-[var(--destructive)]',
          )}
        >
          {executionMessage
            ?? (executionStatus === 'success'
              ? (i18n?.executeSuccess ?? 'Executed successfully')
              : (i18n?.executeError ?? 'Execution failed'))}
        </p>
      )}

      {onExecute && !readOnly && (
        <Button type="button" variant="outline" size="sm" className="w-full" disabled={executing} onClick={onExecute}>
          {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {executeLabel ?? (semanticType ? executeLabels[semanticType] : 'Execute')}
        </Button>
      )}

      {runAgentIOSummary ? <FlowStepIOPanel summary={runAgentIOSummary} i18n={i18n} /> : null}

      {semanticType === 'trigger' && triggerVariables.length > 0 && (
        <div className="space-y-[var(--spacing-sm)]">
          <p className="text-[11px] font-semibold text-[var(--foreground)]">
            {i18n?.availableVariables ?? 'Available variables'}
          </p>
          <div className="space-y-[var(--spacing-xs)]">
            {triggerVariables.map((v) => (
              <div key={v.path} className="flex items-center gap-[var(--spacing-xs)] text-[10px]">
                <code className="rounded bg-[var(--muted)] px-[var(--spacing-xs)] py-[1px] font-mono text-[10px] text-[var(--accent)]">
                  {`{{${v.path}}}`}
                </code>
                <span className="text-[var(--foreground-muted)]">{v.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {semanticType === 'condition' && !readOnly && (
        <FlowExpressionBuilder
          params={params}
          triggerVariables={triggerVariables}
          onUpdate={onUpdateParam}
          readOnly={readOnly}
        />
      )}

      {datasourceGroups.map(({ field, key, label, options }) => (
        <div key={field.key} className="space-y-[var(--spacing-xs)]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">{label}</p>
          {options.length === 0 ? (
            <p className="text-[9px] italic text-[var(--foreground-muted)]">
              {(i18n?.emptyDataSource ?? 'No options — inject dataSources.{key}').replace('{key}', key)}
            </p>
          ) : (
            <div className="flex flex-wrap gap-[var(--spacing-xs)]">
              {options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdateParam(field.key, opt.id ?? opt.value)}
                  className="cursor-pointer rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-[var(--spacing-sm)] py-[2px] text-[9px] text-[var(--primary)]"
                >
                  {opt.label}
                  {opt.meta?.role ? (
                    <span className="ml-[var(--spacing-xs)] opacity-60">{String(opt.meta.role)}</span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
          <InputText
            id={`flow-field-${field.key}`}
            value={String(params[field.key] ?? '')}
            onChange={(e) => onUpdateParam(field.key, e.target.value)}
            placeholder={field.placeholder}
            data-field-key={field.key}
            disabled={readOnly}
            fullWidth
            className="font-mono text-xs"
          />
        </div>
      ))}

      {configFields.length === 0 && semanticType !== 'trigger' && semanticType !== 'condition' && (
        <p className="text-[10px] italic text-[var(--foreground-muted)]">
          {i18n?.noConfigFields ?? 'No configurable fields for this node'}
        </p>
      )}

      {action === 'run_agent' ? (
        <>
          {renderFieldGroup('general')}
          {renderFieldGroup('input')}
          {renderFieldGroup('output')}
        </>
      ) : (
        <>
          {(['general', 'input', 'output'] as FlowConfigFieldGroup[]).map(renderFieldGroup)}
          {semanticType !== 'trigger'
            && triggerVariables.length > 0
            && templateFields.length > 0
            && !fieldsByGroup.input.length ? (
              <div className="space-y-[var(--spacing-xs)]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                  {i18n?.insertVariable ?? 'Insert variable'}
                </p>
                <div className="flex flex-wrap gap-[var(--spacing-xs)]">
                  {triggerVariables.map((v) => (
                    <button
                      key={v.path}
                      type="button"
                      onClick={() => insertVariable(v.path)}
                      title={`${v.label} — e.g. ${v.example ?? v.path}`}
                      className="cursor-pointer rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-[var(--spacing-sm)] py-[2px] font-mono text-[9px] text-[var(--primary)] transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/20 focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    >
                      {`{{${v.path}}}`}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
        </>
      )}

      {Object.keys(params).length > 0 && (
        <details>
          <summary className="cursor-pointer text-[10px] text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
            {i18n?.paramsJson ?? 'JSON params'}
          </summary>
          <pre className="mt-[var(--spacing-xs)] overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] p-[var(--spacing-sm)] text-[10px] text-[var(--foreground-muted)]">
            {JSON.stringify(params, null, 2)}
          </pre>
        </details>
      )}

      <div className="flex flex-col gap-[var(--spacing-xs)] border-t border-[var(--border)] pt-[var(--spacing-md)]">
        {onDuplicate && (
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={onDuplicate}>
            <Copy className="h-4 w-4" />
            {i18n?.duplicateNode ?? 'Duplicate node'}
          </Button>
        )}
        {onDelete && (
          <Button type="button" variant="destructive" size="sm" className="w-full" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            {i18n?.deleteNode ?? 'Delete node'}
          </Button>
        )}
      </div>
    </div>
  )
}

FlowConfigPanel.displayName = 'FlowConfigPanel'
export default FlowConfigPanel
