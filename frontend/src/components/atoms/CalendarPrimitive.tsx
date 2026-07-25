import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { es } from "react-day-picker/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/atoms/Button";

export type CalendarPrimitiveProps = DayPickerProps;

function CalendarPrimitive({ className, classNames, showOutsideDays = true, ...props }: CalendarPrimitiveProps) {
  return (
    <DayPicker
      locale={es}
      showOutsideDays={showOutsideDays}
      className={cn("p-[var(--spacing-sm)]", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-[var(--spacing-md)]",
        month: "flex flex-col gap-[var(--spacing-md)]",
        month_caption: "flex justify-center pt-[var(--spacing-xs)] relative items-center w-full",
        caption_label: "text-sm font-medium text-[var(--foreground)]",
        nav: "flex items-center gap-[var(--spacing-xs)]",
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "absolute left-[var(--spacing-xs)] h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "absolute right-[var(--spacing-xs)] h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-[var(--foreground-muted)] rounded-[var(--radius-sm)] w-9 font-normal text-[0.8rem]",
        week: "flex w-full mt-[var(--spacing-xs)]",
        day: "relative p-0 text-center text-sm focus-within:relative focus-within:z-[var(--z-dropdown)]",
        day_button: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
        ),
        range_start: "day-range-start rounded-l-[var(--radius-sm)] bg-[var(--primary)] text-[var(--primary-foreground)]",
        range_end: "day-range-end rounded-r-[var(--radius-sm)] bg-[var(--primary)] text-[var(--primary-foreground)]",
        selected:
          "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] focus:bg-[var(--primary)] focus:text-[var(--primary-foreground)] rounded-[var(--radius-sm)]",
        today: "bg-[var(--accent)]/15 text-[var(--accent)] font-semibold rounded-[var(--radius-sm)]",
        outside: "day-outside text-[var(--foreground-subtle)] aria-selected:text-[var(--foreground-subtle)]",
        disabled: "text-[var(--foreground-subtle)] opacity-40",
        range_middle: "aria-selected:bg-[var(--accent)]/10 aria-selected:text-[var(--foreground)] rounded-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...chevronProps }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" {...chevronProps} />
          ) : (
            <ChevronRight className="h-4 w-4" {...chevronProps} />
          ),
      }}
      {...props}
    />
  );
}

CalendarPrimitive.displayName = "CalendarPrimitive";

export { CalendarPrimitive };
