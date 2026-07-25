import { useTranslation } from "react-i18next";
import { AlertDialog } from "@/components/molecules/Dialog";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive,
  busy,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog
      visible={open}
      title={title}
      description={description}
      confirmLabel={busy ? t("common.loading") : (confirmLabel ?? t("common.save"))}
      cancelLabel={cancelLabel ?? t("common.cancel")}
      variant={destructive ? "destructive" : "default"}
      onConfirm={busy ? undefined : onConfirm}
      onCancel={onCancel}
    />
  );
}
