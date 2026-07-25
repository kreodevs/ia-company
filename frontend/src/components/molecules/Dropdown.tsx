import * as SelectPrimitive from "@radix-ui/react-select";
import { forwardRef, type ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/atoms/Select";

export interface DropdownInputProps extends Omit<ComponentPropsWithoutRef<typeof SelectPrimitive.Root>, "value" | "onValueChange"> {
  options: { label: string; value: string | number }[];
  value: string | number;
  onChange: (e: { value: string | number }) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
}

export const Dropdown = forwardRef<HTMLButtonElement, DropdownInputProps>(
  ({ options, value, onChange, placeholder = "Seleccionar...", error, className, ...props }, ref) => {
    return (
      <Select value={String(value ?? "")} onValueChange={(newValue) => onChange?.({ value: newValue as string | number })} {...props}>
        <SelectTrigger
          ref={ref}
          className={cn(error && "border-[var(--destructive)] focus:ring-[var(--destructive)]", className)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={String(option.value)} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  },
);
Dropdown.displayName = "Dropdown";

export default Dropdown;
