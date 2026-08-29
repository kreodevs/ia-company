import { forwardRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { InputText } from '@/components/atoms/InputText'
import { ScrollArea } from '@/components/atoms/ScrollArea'
import { FLOW_DRAG_DATA_KEY } from './FlowCanvas'
import { resolvePaletteItemIcon } from './flowEditorIcons'
import type { FlowI18n, FlowPaletteGroup, FlowPaletteItem } from './flowEditorTypes'

export interface FlowEditorFloatingPaletteProps {
  groups: FlowPaletteGroup[]
  search: string
  onSearchChange: (value: string) => void
  onAdd: (item: FlowPaletteItem) => void
  actionIcons?: Record<string, string>
  i18n?: FlowI18n
  className?: string
}

export const FlowEditorFloatingPalette = forwardRef<HTMLDivElement, FlowEditorFloatingPaletteProps>(
  ({ groups, search, onSearchChange, onAdd, actionIcons, i18n, className }, ref) => {
    const [collapsed, setCollapsed] = useState(false)

    return (
      <div
        ref={ref}
        className={cn(
          'pointer-events-none absolute bottom-[var(--spacing-md)] left-[var(--spacing-md)] top-[var(--spacing-md)] z-[var(--z-sticky)] flex',
          collapsed ? 'w-10' : 'w-[220px]',
          className,
        )}
      >
        <div
          className={cn(
            'pointer-events-auto flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]/95 shadow-[var(--shadow-md)] backdrop-blur-sm transition-[width] duration-[var(--transition-base)] motion-reduce:transition-none',
          )}
        >
          <div
            className={cn(
              'flex items-center gap-[var(--spacing-xs)] border-b border-[var(--border)] bg-[var(--secondary)]/80 px-[var(--spacing-xs)] py-[var(--spacing-xs)]',
              collapsed && 'justify-center px-0',
            )}
          >
            {!collapsed && (
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-[var(--spacing-sm)] top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-muted)]" />
                <InputText
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={i18n?.searchPlaceholder ?? 'Search nodes…'}
                  className="h-8 pl-8 text-xs"
                  fullWidth
                  aria-label={i18n?.searchPlaceholder ?? 'Search nodes'}
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius)] text-[var(--foreground-muted)] transition-colors duration-[var(--transition-base)] hover:bg-[var(--background)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] motion-reduce:transition-none"
              aria-label={collapsed ? i18n?.expandPalette ?? 'Expand palette' : i18n?.collapsePalette ?? 'Collapse palette'}
              title={collapsed ? i18n?.expandPalette ?? 'Expand palette' : i18n?.collapsePalette ?? 'Collapse palette'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {!collapsed && (
            <ScrollArea className="min-h-0 flex-1 [&>[data-radix-scroll-area-viewport]]:h-full">
              <div className="p-[var(--spacing-xs)]">
                {groups.length === 0 ? (
                  <p className="px-[var(--spacing-sm)] py-[var(--spacing-md)] text-center text-[10px] text-[var(--foreground-muted)]">
                    {i18n?.emptyPalette ?? 'No nodes match your search'}
                  </p>
                ) : (
                  <div className="space-y-[var(--spacing-sm)]">
                    {groups.map((group) => (
                      <div key={group.type} className="space-y-[var(--spacing-xs)]">
                        <p className="px-[var(--spacing-xs)] text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                          {group.title}
                        </p>
                        <div className="flex flex-col gap-[var(--spacing-xs)]">
                          {group.items.map((item) => {
                            const Icon = resolvePaletteItemIcon(item, actionIcons)
                            const disabled = item.semanticType === 'trigger'
                            return (
                              <button
                                key={`${group.type}-${item.label}-${item.action ?? ''}`}
                                type="button"
                                draggable={!disabled}
                                disabled={disabled}
                                onClick={() => onAdd(item)}
                                onDragStart={(event) => {
                                  event.dataTransfer.setData(FLOW_DRAG_DATA_KEY, JSON.stringify(item))
                                  event.dataTransfer.effectAllowed = 'move'
                                }}
                                title={`${item.description} — ${i18n?.paletteHint ?? 'click or drag to canvas'}`}
                                className={cn(
                                  'flex w-full items-center gap-[var(--spacing-sm)] rounded-[var(--radius)] border border-transparent px-[var(--spacing-sm)] py-[var(--spacing-xs)] text-left transition-all duration-[var(--transition-base)]',
                                  'hover:-translate-y-0.5 hover:border-[var(--border)] hover:bg-[var(--background)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                                  disabled
                                    ? 'cursor-not-allowed opacity-40'
                                    : 'cursor-grab active:cursor-grabbing',
                                )}
                              >
                                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--secondary)] text-[var(--primary)]">
                                  <Icon className="h-3.5 w-3.5" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[11px] font-medium text-[var(--foreground)]">
                                    {item.label}
                                  </span>
                                  <span className="block truncate text-[9px] text-[var(--foreground-muted)]">
                                    {item.description}
                                  </span>
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {i18n?.paletteHint && (
                  <p className="mt-[var(--spacing-sm)] border-t border-[var(--border)] px-[var(--spacing-xs)] pt-[var(--spacing-sm)] text-[9px] leading-relaxed text-[var(--foreground-muted)]">
                    {i18n.paletteHint}
                  </p>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    )
  },
)

FlowEditorFloatingPalette.displayName = 'FlowEditorFloatingPalette'
export default FlowEditorFloatingPalette
