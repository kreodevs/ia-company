import { forwardRef, useState, useEffect, useRef, useCallback } from 'react'
import { HexColorPicker } from 'react-colorful'
import { cn } from '@/lib/utils'

export interface ColorPickerProps {
    value: string;
    onChange: (color: string) => void;
    label?: string;
    className?: string;
}

function normalizeHex(color: string): string {
    const c = color || '#000000'
    return c.startsWith('#') ? c : `#${c}`
}

export const ColorPicker = forwardRef<HTMLDivElement, ColorPickerProps>(
    ({ value, onChange, label, className }, ref) => {
        const [internalColor, setInternalColor] = useState(() => normalizeHex(value))
        const [isOpen, setIsOpen] = useState(false)
        const [inputValue, setInputValue] = useState(() => normalizeHex(value))
        const popoverRef = useRef<HTMLDivElement>(null)

        // Sync internal state when controlled value changes
        useEffect(() => {
            const normalized = normalizeHex(value)
            setInternalColor(normalized)
            setInputValue(normalized)
        }, [value])

        const handlePickerChange = useCallback((color: string) => {
            setInternalColor(color)
            setInputValue(color)
            onChange(color)
        }, [onChange])

        const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value
            setInputValue(val)
            if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                setInternalColor(val)
                onChange(val)
            }
        }, [onChange])

        const handleInputBlur = useCallback(() => {
            if (!/^#[0-9a-fA-F]{6}$/.test(inputValue)) {
                setInputValue(internalColor)
            }
        }, [inputValue, internalColor])

        // Close popover on outside click
        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                    setIsOpen(false)
                }
            }
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }, [])

        return (
            <div ref={ref} className={cn("relative", className)}>
                {label && (
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-[var(--spacing-xs)]">
                        {label}
                    </label>
                )}
                <div className="flex items-center gap-[var(--spacing-md)]">
                    <div className="relative">
                        <button
                            type="button"
                            className="w-10 h-10 rounded-lg border-2 border-[var(--border)] shadow-sm cursor-pointer overflow-hidden focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 transition-shadow"
                            style={{ backgroundColor: internalColor }}
                            onClick={() => setIsOpen(!isOpen)}
                            aria-label="Select color"
                            aria-expanded={isOpen}
                        />
                        {isOpen && (
                            <div
                                ref={popoverRef}
                                className="absolute top-full left-0 mt-[var(--spacing-xs)] z-[var(--z-popover)] bg-[var(--popover)] border border-[var(--border)] rounded-[var(--radius)] shadow-[var(--shadow-lg)] p-[var(--spacing-sm)]"
                            >
                                <HexColorPicker color={internalColor} onChange={handlePickerChange} />
                            </div>
                        )}
                    </div>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        className="w-28 px-[var(--spacing-sm)] py-[var(--spacing-xs)] text-sm font-mono text-[var(--foreground)] bg-[var(--background)] border border-[var(--input-border)] rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--input-focus)] uppercase"
                        maxLength={7}
                        placeholder="#000000"
                        aria-label="Hex color value"
                    />
                </div>
            </div>
        )
    }
)
ColorPicker.displayName = 'ColorPicker'
