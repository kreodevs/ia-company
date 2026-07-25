import { forwardRef, useState, useRef, type KeyboardEvent, type ChangeEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TagInputProps {
  value?: string[];
  onChange?: (e: { value: string[] }) => void;
  placeholder?: string;
  error?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export const TagInput = forwardRef<HTMLInputElement, TagInputProps>(
  ({ value = [], onChange, placeholder, error, label, className, disabled, id }, ref) => {
    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const handleRef = (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    const addTag = () => {
      const trimmed = inputValue.trim();
      if (trimmed && !value.includes(trimmed)) {
        onChange?.({ value: [...value, trimmed] });
      }
      setInputValue("");
    };

    const removeTag = (index: number) => {
      onChange?.({ value: value.filter((_, i) => i !== index) });
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addTag();
      } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
        removeTag(value.length - 1);
      }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    };

    const handleContainerClick = () => {
      inputRef.current?.focus();
    };

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && <label className="text-sm font-medium leading-none text-[var(--foreground)]">{label}</label>}
        <div
          className={cn(
            "flex flex-wrap gap-[var(--spacing-sm)] p-[var(--spacing-sm)] w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] ring-offset-[var(--background)] transition-colors focus-within:ring-2 focus-within:ring-[var(--ring)] focus-within:ring-offset-2 hover:border-[var(--border-hover)] cursor-text",
            error && "border-[var(--destructive)] focus-within:ring-[var(--destructive)]",
            disabled && "opacity-50 cursor-not-allowed",
            className,
          )}
          onClick={handleContainerClick}
        >
          {value.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-[var(--spacing-xs)] text-xs font-semibold rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
            >
              {tag}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(index);
                }}
                className="w-3.5 h-3.5 cursor-pointer hover:opacity-80 transition-opacity ml-[var(--spacing-xs)] flex items-center justify-center bg-transparent border-0 p-0 text-inherit"
                disabled={disabled}
                aria-label={`Remove ${tag}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          <input
            ref={handleRef}
            id={id}
            type="text"
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ""}
            disabled={disabled}
            className="flex-1 w-full min-w-[100px] p-[var(--spacing-sm)] py-[var(--spacing-xs)] text-sm bg-transparent border-0 outline-none text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]"
          />
        </div>
        {error && <span className="text-[14px] text-[var(--destructive)]">{error}</span>}
      </div>
    );
  },
);
TagInput.displayName = "TagInput";
