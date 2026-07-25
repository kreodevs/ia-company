import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { ChevronDown, Check, X, Search } from "lucide-react";

import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  label: string;
  value: any;
}

export interface MultiSelectInputProps {
  options?: MultiSelectOption[];
  value?: any[];
  onChange?: (e: { value: any[] }) => void;
  placeholder?: string;
  error?: boolean;
  display?: "chip";
  className?: string;
  disabled?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

export const MultiSelect = React.forwardRef<HTMLButtonElement, MultiSelectInputProps>(
  (
    {
      options = [],
      value = [],
      onChange,
      placeholder = "Seleccionar...",
      error = false,
      display,
      className,
      disabled = false,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const searchInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
      if (!open) {
        setSearch("");
      }
    }, [open]);

    React.useEffect(() => {
      if (open && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
    }, [open]);

    const selectedCount = value.length;
    const isSelected = (optionValue: any) => value.some((v) => v === optionValue);

    const toggleOption = (optionValue: any) => {
      const newValue = isSelected(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue];
      onChange?.({ value: newValue });
    };

    const removeChip = (e: React.MouseEvent, optionValue: any) => {
      e.stopPropagation();
      const newValue = value.filter((v) => v !== optionValue);
      onChange?.({ value: newValue });
    };

    const filteredOptions = search.trim()
      ? options.filter((opt) => opt.label.toLowerCase().includes(search.toLowerCase().trim()))
      : options;

    const selectedOptions = options.filter((opt) => isSelected(opt.value));

    const triggerStyles = cn(
      "flex min-h-10 w-full items-center justify-between gap-[var(--spacing-sm)]",
      "rounded-[var(--radius)]",
      "border border-[var(--input-border)]",
      "bg-[var(--input)] px-[var(--spacing-md)] py-[var(--spacing-sm)]",
      "text-sm text-[var(--foreground)]",
      "transition-all duration-[var(--transition-base)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ring-offset)]",
      "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--muted)]",
      "hover:border-[var(--border-hover)]",
      "data-[state=open]:ring-2 data-[state=open]:ring-[var(--ring)]",
      error && "border-[var(--destructive)] focus-visible:ring-[var(--destructive)]",
      className,
    );

    const chipStyles =
      "inline-flex items-center gap-[var(--spacing-xs)] px-[var(--spacing-sm)] py-[var(--spacing-xxs)] text-xs font-medium rounded-[var(--radius-sm)] bg-[var(--secondary)] text-[var(--foreground)] border border-[var(--border)]";

    return (
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen} modal={false}>
        <PopoverPrimitive.Trigger asChild disabled={disabled}>
          <button ref={ref} type="button" disabled={disabled} className={triggerStyles} {...props}>
            <div className="flex-1 flex flex-wrap items-center gap-[var(--spacing-xs)] text-left">
              {selectedCount > 0 ? (
                display === "chip" ? (
                  <>
                    {selectedOptions.slice(0, 3).map((opt) => (
                      <span key={String(opt.value)} className={chipStyles}>
                        <span className="text-xs">{opt.label}</span>
                        <button
                          type="button"
                          onClick={(e) => removeChip(e, opt.value)}
                          className="flex items-center justify-center w-3.5 h-3.5 rounded-[var(--radius-sm)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors shrink-0"
                          aria-label={`Quitar ${opt.label}`}
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                    {selectedCount > 3 && (
                      <span className="text-xs text-[var(--foreground-muted)]">
                        +{selectedCount - 3} más
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-[var(--foreground)]">
                    {selectedCount} seleccionado{selectedCount !== 1 ? "s" : ""}
                  </span>
                )
              ) : (
                <span className="text-sm text-[var(--foreground-muted)]">{placeholder}</span>
              )}
            </div>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-[var(--foreground-muted)] shrink-0 transition-transform duration-[var(--transition-base)]",
                open && "rotate-180",
              )}
            />
          </button>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={4}
            className={cn(
              "z-[var(--z-dropdown)] w-[var(--radix-popover-trigger-width)] min-w-[200px]",
              "overflow-hidden rounded-[var(--radius)]",
              "border border-[var(--border)]",
              "bg-[var(--popover)]",
              "shadow-lg",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
            )}
          >
            <div className="px-[var(--spacing-md)] pt-[var(--spacing-md)] pb-[var(--spacing-sm)] border-b border-[var(--border)]">
              <div className="relative flex items-center">
                <Search className="absolute left-[var(--spacing-sm)] w-4 h-4 text-[var(--foreground-muted)] pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className={cn(
                    "w-full h-9 rounded-[var(--radius-sm)]",
                    "border border-[var(--input-border)]",
                    "bg-[var(--input)] pl-[var(--spacing-xl)] pr-[var(--spacing-md)]",
                    "text-sm text-[var(--foreground)]",
                    "placeholder:text-[var(--foreground-muted)]",
                    "focus:outline-none focus:ring-1 focus:ring-[var(--ring)] focus:border-[var(--input-focus)]",
                  )}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-[var(--spacing-sm)] flex items-center justify-center w-4 h-4 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-60 overflow-auto py-[var(--spacing-xs)]">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => {
                  const checked = isSelected(option.value);
                  return (
                    <label
                      key={String(option.value)}
                      className={cn(
                        "relative flex items-center gap-[var(--spacing-sm)]",
                        "px-[var(--spacing-md)] py-[var(--spacing-sm)] text-sm",
                        "text-[var(--foreground)]",
                        "cursor-pointer select-none",
                        "transition-colors duration-[var(--transition-fast)]",
                        "hover:bg-[var(--secondary)]",
                        "has-[input:focus-visible]:bg-[var(--secondary)]",
                      )}
                    >
                      <CheckboxPrimitive.Root
                        checked={checked}
                        onCheckedChange={() => toggleOption(option.value)}
                        className={cn(
                          "flex items-center justify-center",
                          "w-4 h-4 rounded-[var(--radius-sm)]",
                          "border border-[var(--input-border)]",
                          "bg-[var(--input)]",
                          "transition-all duration-[var(--transition-fast)]",
                          "data-[state=checked]:bg-[var(--primary)] data-[state=checked]:border-[var(--primary)]",
                          "hover:border-[var(--border-hover)]",
                          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)]",
                        )}
                      >
                        <CheckboxPrimitive.Indicator className="flex items-center justify-center">
                          <Check
                            className="w-3 h-3 text-[var(--primary-foreground)]"
                            strokeWidth={3}
                          />
                        </CheckboxPrimitive.Indicator>
                      </CheckboxPrimitive.Root>
                      <span className="flex-1 text-sm">{option.label}</span>
                    </label>
                  );
                })
              ) : (
                <div className="px-[var(--spacing-md)] py-[var(--spacing-lg)] text-center text-sm text-[var(--foreground-muted)]">
                  {search ? "Sin resultados" : "No hay opciones disponibles"}
                </div>
              )}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    );
  },
);

MultiSelect.displayName = "MultiSelect";

export default MultiSelect;
