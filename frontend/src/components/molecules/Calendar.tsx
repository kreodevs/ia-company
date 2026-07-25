import { Calendar as PrimeCalendar, type CalendarProps as PrimeCalendarProps } from "primereact/calendar";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { forwardRef } from "react";
import { type Nullable } from "primereact/ts-helpers";

export interface CalendarInputProps extends Omit<PrimeCalendarProps, "pt" | "variant" | "selectionMode"> {
  error?: boolean;
  fullWidth?: boolean;
  variant?: "default" | "inline";
  rounded?: boolean;
  selectionMode?: "single" | "multiple" | "range";
}

export const Calendar = forwardRef<any, CalendarInputProps>(
  (
    { error, fullWidth, variant = "default", rounded = false, className = "", selectionMode = "single", ...props },
    ref,
  ) => {
    const roundedClass = rounded ? "!rounded-full" : "!rounded-[var(--radius)]";

    const inputStyles = `
      !flex !h-10 !w-full ${roundedClass}
      !border !border-[var(--input-border)]
      !bg-[var(--input)] !px-3 !py-2 !pr-10 !text-sm !text-[var(--foreground)]
      placeholder:!text-[var(--foreground-muted)]
      transition-all duration-[var(--transition-base)]
      focus:!outline-none focus:!ring-2 focus:!ring-[var(--ring)] focus:!ring-offset-2 focus:!ring-offset-[var(--ring-offset)] focus:!border-[var(--input-focus)]
      disabled:!cursor-not-allowed disabled:!opacity-50 disabled:!bg-[var(--muted)]
    `;

    const errorStyles = error ? "!border-[var(--destructive)] focus:!ring-[var(--destructive)]" : "";
    const widthStyles = fullWidth ? "!w-full" : "";

    const ptStyles = {
      root: { className: `${widthStyles} ${className} !relative`.trim() },
      input: { className: `${inputStyles} ${errorStyles}`.trim() },
      dropdownButton: {
        root: {
          className: `
            !absolute !right-1 !top-1/2 !-translate-y-1/2 !h-8 !w-8
            !text-[var(--foreground-muted)]
            hover:!text-[var(--foreground)] hover:!bg-[var(--secondary)]
            transition-colors !bg-transparent !border-0
            !flex !items-center !justify-center !rounded-full
          `,
        },
      },
      panel: {
        className: `
          !mt-1 !p-3 !rounded-[var(--radius)] !border !border-[var(--border)]
          !bg-[var(--popover)] !shadow-lg !z-[var(--z-dropdown)]
        `,
      },
      header: { className: "flex items-center justify-between mb-[var(--spacing-sm)]" },
      previousButton: {
        className:
          "p-1.5 rounded-[var(--radius-sm)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors",
      },
      nextButton: {
        className:
          "p-1.5 rounded-[var(--radius-sm)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors",
      },
      title: { className: "flex items-center gap-[var(--spacing-sm)]" },
      monthTitle: {
        className:
          "px-[var(--spacing-sm)] py-[var(--spacing-xs)] rounded-[var(--radius-sm)] text-sm font-medium text-[var(--foreground)] hover:bg-[var(--secondary)] cursor-pointer transition-colors",
      },
      yearTitle: {
        className:
          "px-[var(--spacing-sm)] py-[var(--spacing-xs)] rounded-[var(--radius-sm)] text-sm font-medium text-[var(--foreground)] hover:bg-[var(--secondary)] cursor-pointer transition-colors",
      },
      table: { className: "w-full border-collapse" },
      tableHeader: { className: "" },
      tableHeaderCell: {
        className: "p-[var(--spacing-sm)] text-xs font-medium text-[var(--foreground-muted)] text-center",
      },
      tableBody: { className: "" },
      tableBodyRow: { className: "" },
      day: {
        className: `
          w-9 h-9 p-0 m-[var(--spacing-xxs)] text-sm text-center rounded-[var(--radius-sm)] cursor-pointer transition-colors
          hover:bg-[var(--secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]
          [&[data-p-today=true]]:font-bold [&[data-p-today=true]]:text-[var(--accent)]
          [&[data-p-highlight=true]]:bg-[var(--primary)] [&[data-p-highlight=true]]:text-[var(--primary-foreground)]
          [&[data-p-disabled=true]]:opacity-30 [&[data-p-disabled=true]]:cursor-not-allowed
          [&[data-p-other-month=true]]:text-[var(--foreground-subtle)]
        `,
      },
      dayLabel: { className: "flex items-center justify-center w-full h-full" },
      monthPicker: { className: "grid grid-cols-3 gap-[var(--spacing-sm)] p-[var(--spacing-sm)]" },
      month: {
        className:
          "px-[var(--spacing-md)] py-[var(--spacing-sm)] text-sm text-center rounded-[var(--radius)] cursor-pointer transition-colors hover:bg-[var(--secondary)] [&[data-p-highlight=true]]:bg-[var(--primary)] [&[data-p-highlight=true]]:text-[var(--primary-foreground)]",
      },
      yearPicker: { className: "grid grid-cols-4 gap-[var(--spacing-sm)] p-[var(--spacing-sm)]" },
      year: {
        className:
          "px-[var(--spacing-md)] py-[var(--spacing-sm)] text-sm text-center rounded-[var(--radius)] cursor-pointer transition-colors hover:bg-[var(--secondary)] [&[data-p-highlight=true]]:bg-[var(--primary)] [&[data-p-highlight=true]]:text-[var(--primary-foreground)]",
      },
      timePicker: {
        className:
          "flex items-center justify-center gap-[var(--spacing-sm)] pt-[var(--spacing-md)] mt-[var(--spacing-md)] border-t border-[var(--border)]",
      },
      hourPicker: { className: "flex flex-col items-center" },
      minutePicker: { className: "flex flex-col items-center" },
      secondPicker: { className: "flex flex-col items-center" },
      incrementButton: {
        className:
          "p-[var(--spacing-xs)] rounded-[var(--radius-sm)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors",
      },
      decrementButton: {
        className:
          "p-[var(--spacing-xs)] rounded-[var(--radius-sm)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors",
      },
      separator: { className: "text-[var(--foreground-muted)] text-lg" },
      ampm: {
        className:
          "px-[var(--spacing-sm)] py-[var(--spacing-xs)] rounded-[var(--radius-sm)] text-sm font-medium cursor-pointer transition-colors hover:bg-[var(--secondary)]",
      },
      buttonBar: {
        className:
          "flex items-center justify-end gap-[var(--spacing-sm)] pt-[var(--spacing-md)] mt-[var(--spacing-md)] border-t border-[var(--border)]",
      },
      todayButton: {
        className:
          "px-[var(--spacing-md)] py-1.5 text-xs font-medium rounded-[var(--radius)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors",
      },
      clearButton: {
        className:
          "px-[var(--spacing-md)] py-1.5 text-xs font-medium rounded-[var(--radius)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors",
      },
      group: { className: "flex gap-[var(--spacing-md)]" },
      groupPanel: { className: "" },
      datepickerMask: { className: "fixed inset-0" },
    };

    return (
      <PrimeCalendar
        ref={ref}
        selectionMode={selectionMode}
        showIcon={variant === "default"}
        showButtonBar
        todayButtonClassName={ptStyles.todayButton.className}
        clearButtonClassName={ptStyles.clearButton.className}
        {...props}
        pt={ptStyles}
        inputClassName={ptStyles.input.className}
        icon={<CalendarIcon className="w-4 h-4 ml-[var(--spacing-sm)]" />}
        prevIcon={<ChevronLeft className="w-4 h-4" />}
        nextIcon={<ChevronRight className="w-4 h-4" />}
        incrementIcon={<ChevronLeft className="w-3 h-3 rotate-90" />}
        decrementIcon={<ChevronRight className="w-3 h-3 rotate-90" />}
        inline={variant === "inline"}
      />
    );
  },
);

Calendar.displayName = "Calendar";

export interface DateRangePickerProps extends Omit<CalendarInputProps, "selectionMode" | "value" | "onChange"> {
  value?: Nullable<(Date | null)[]>;
  onChange?: (value: Nullable<(Date | null)[]>) => void;
  numberOfMonths?: number;
}

export const DateRangePicker = forwardRef<HTMLSpanElement, DateRangePickerProps>(
  ({ value, onChange, numberOfMonths = 2, placeholder = "Seleccionar rango de fechas", ...props }, ref) => {
    return (
      <Calendar
        ref={ref}
        value={value as any}
        onChange={(e) => onChange?.(e.value as Nullable<(Date | null)[]>)}
        selectionMode="range"
        numberOfMonths={numberOfMonths}
        placeholder={placeholder}
        readOnlyInput
        {...props}
      />
    );
  },
);

DateRangePicker.displayName = "DateRangePicker";

export default Calendar;
