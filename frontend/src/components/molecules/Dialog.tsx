import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { forwardRef, type ReactNode, type ComponentPropsWithoutRef } from "react";

export interface DialogInputProps extends Omit<ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, "title"> {
  visible?: boolean;
  onHide?: () => void;
  header?: ReactNode;
  footer?: ReactNode;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showClose?: boolean;
  children?: ReactNode;
}

const sizeStyles: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-[90vw] w-full",
};

export const Dialog = forwardRef<HTMLDivElement, DialogInputProps>(
  (
    {
      title,
      description,
      size = "md",
      showClose = true,
      header,
      footer,
      children,
      visible,
      onHide,
      className = "",
      ...props
    },
    ref,
  ) => {
    const sizeClass = sizeStyles[size];

    return (
      <DialogPrimitive.Root
        open={visible}
        onOpenChange={(open) => {
          if (!open) onHide?.();
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[var(--z-modal)] bg-[var(--background)]/60 backdrop-blur-sm transition-opacity duration-200 data-[state=entering]:animate-fade-in" />
          <DialogPrimitive.Content
            ref={ref}
            className={`fixed left-1/2 top-1/2 z-[var(--z-modal)] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto w-full ${sizeClass} rounded-[var(--radius-lg)] bg-[var(--card)] border border-[var(--border)] shadow-xl animate-slide-in ${className}`}
            {...props}
          >
            {header ? (
              <div className="flex items-start justify-between gap-[var(--spacing-md)] px-[var(--spacing-lg)] py-[var(--spacing-md)] border-b border-[var(--border)]">
                {header}
              </div>
            ) : (
              <div className="flex items-start justify-between gap-[var(--spacing-md)] px-[var(--spacing-lg)] py-[var(--spacing-md)] border-b border-[var(--border)]">
                <div className="flex-1 min-w-0">
                  {title && (
                    <DialogPrimitive.Title className="text-lg font-semibold text-[var(--foreground)]">
                      {title}
                    </DialogPrimitive.Title>
                  )}
                  {description && (
                    <DialogPrimitive.Description className="mt-[var(--spacing-xs)] text-sm text-[var(--foreground-muted)]">
                      {description}
                    </DialogPrimitive.Description>
                  )}
                </div>
                {showClose && (
                  <DialogPrimitive.Close
                    className="p-1.5 rounded-[var(--radius-sm)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    aria-label="Cerrar"
                  >
                    <X className="w-4 h-4" />
                  </DialogPrimitive.Close>
                )}
              </div>
            )}

            <div className="px-[var(--spacing-lg)] py-[var(--spacing-md)]">{children}</div>

            {footer && (
              <div className="flex items-center justify-end gap-[var(--spacing-md)] px-[var(--spacing-lg)] py-[var(--spacing-md)] border-t border-[var(--border)] bg-[var(--secondary)]/50">
                {footer}
              </div>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  },
);

Dialog.displayName = "Dialog";

export interface AlertDialogProps extends Omit<DialogInputProps, "footer"> {
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  variant?: "default" | "destructive";
  busy?: boolean;
}

export const AlertDialog = ({
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  onHide,
  variant = "default",
  busy = false,
  visible,
  ...props
}: AlertDialogProps) => {
  const confirmButtonStyles =
    variant === "destructive"
      ? "bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:bg-[var(--destructive)]/90"
      : "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]";

  return (
    <Dialog
      title={title}
      description={description}
      size="sm"
      showClose={false}
      visible={visible}
      onHide={() => {
        if (!busy) onCancel?.();
      }}
      footer={
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => onCancel?.()}
            className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-sm font-medium rounded-[var(--radius)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm?.()}
            className={`px-[var(--spacing-md)] py-[var(--spacing-sm)] text-sm font-medium rounded-[var(--radius)] ${confirmButtonStyles} transition-colors disabled:opacity-50`}
          >
            {confirmLabel}
          </button>
        </>
      }
      {...props}
    />
  );
};

export default Dialog;
