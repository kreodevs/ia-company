import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";
import { Switch } from "../atoms/Switch";
import { Label } from "../atoms/Label";

export type LegacyRoleFlagKey = "admin" | "sales" | "warehouse";
export type LegacyRoleFlags = Record<LegacyRoleFlagKey, boolean>;

export interface RoleFlagDefinition {
  key: LegacyRoleFlagKey;
  label: string;
  description?: string;
}

const DEFAULT_FLAGS: RoleFlagDefinition[] = [
  { key: "admin", label: "Administrador" },
  { key: "sales", label: "Ventas" },
  { key: "warehouse", label: "Almacén" },
];

export interface RoleFlagsGroupProps {
  value: LegacyRoleFlags;
  onChange: (value: LegacyRoleFlags) => void;
  disabled?: boolean;
  readOnly?: boolean;
  layout?: "inline" | "stacked";
  flags?: RoleFlagDefinition[];
  className?: string;
  name?: string;
}

export const RoleFlagsGroup = forwardRef<
  HTMLFieldSetElement | HTMLDivElement,
  RoleFlagsGroupProps
>(
  (
    {
      value,
      onChange,
      disabled = false,
      readOnly = false,
      layout = "inline",
      flags = DEFAULT_FLAGS,
      className,
      name,
    },
    ref,
  ) => {
    const baseId = useId();
    const isDisabled = disabled || readOnly;

    const handleToggle = (key: LegacyRoleFlagKey, checked: boolean) => {
      if (isDisabled) return;
      onChange({ ...value, [key]: checked });
    };

    const renderInlineFlag = (flag: RoleFlagDefinition) => {
      const id = `${baseId}-${flag.key}`;
      const descId = flag.description ? `${id}-desc` : undefined;

      return (
        <div key={flag.key} className="flex items-center gap-[var(--spacing-sm)]">
          <Switch
            id={id}
            name={name ? `${name}.${flag.key}` : undefined}
            checked={value[flag.key]}
            disabled={isDisabled}
            onCheckedChange={(checked) => handleToggle(flag.key, checked)}
            aria-describedby={descId}
          />
          <div className="flex flex-col gap-[var(--spacing-xxs)]">
            <Label htmlFor={id} className="text-sm text-[var(--foreground)] cursor-pointer">
              {flag.label}
            </Label>
            {flag.description && (
              <p id={descId} className="text-xs text-[var(--foreground-muted)]">
                {flag.description}
              </p>
            )}
          </div>
        </div>
      );
    };

    const renderStackedFlag = (flag: RoleFlagDefinition) => {
      const id = `${baseId}-${flag.key}`;
      const descId = flag.description ? `${id}-desc` : undefined;

      return (
        <div
          key={flag.key}
          className="flex items-start justify-between gap-[var(--spacing-md)] py-[var(--spacing-sm)] border-b border-[var(--border)] last:border-b-0"
        >
          <div className="flex flex-col gap-[var(--spacing-xxs)]">
            <Label htmlFor={id} className="text-[var(--foreground)] cursor-pointer">
              {flag.label}
            </Label>
            {flag.description && (
              <p id={descId} className="text-xs text-[var(--foreground-muted)]">
                {flag.description}
              </p>
            )}
          </div>
          <Switch
            id={id}
            name={name ? `${name}.${flag.key}` : undefined}
            checked={value[flag.key]}
            disabled={isDisabled}
            onCheckedChange={(checked) => handleToggle(flag.key, checked)}
            aria-describedby={descId}
          />
        </div>
      );
    };

    if (layout === "stacked") {
      return (
        <fieldset
          ref={ref as React.Ref<HTMLFieldSetElement>}
          disabled={disabled}
          className={cn(
            "border border-[var(--border)] rounded-[var(--radius)] p-[var(--spacing-md)] bg-[var(--background)]",
            className,
          )}
        >
          <legend className="px-[var(--spacing-xs)] text-sm font-semibold text-[var(--foreground)]">
            Roles
          </legend>
          <div className="mt-[var(--spacing-sm)]">{flags.map(renderStackedFlag)}</div>
        </fieldset>
      );
    }

    return (
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        role="group"
        aria-label="Roles"
        className={cn("flex flex-wrap gap-[var(--spacing-lg)]", className)}
      >
        {flags.map(renderInlineFlag)}
      </div>
    );
  },
);

RoleFlagsGroup.displayName = "RoleFlagsGroup";

export default RoleFlagsGroup;
