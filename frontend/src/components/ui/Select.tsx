import type { ChangeEvent, ReactNode } from "react";
import {
  Select as KreoSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/Select";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel?: string;
  className?: string;
  id?: string;
  size?: "sm" | "md";
  placeholder?: string;
}

export default function Select({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  id,
  size = "md",
  placeholder,
}: SelectProps) {
  return (
    <KreoSelect value={value} onValueChange={onChange}>
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        className={cn(size === "sm" && "h-8 text-xs", className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value || "__empty__"} value={option.value} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </KreoSelect>
  );
}

/** @deprecated Native select handler — prefer `onChange` string callback */
export type NativeSelectChangeEvent = ChangeEvent<HTMLSelectElement>;
