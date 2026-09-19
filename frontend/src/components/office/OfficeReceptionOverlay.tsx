import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import CoordinatorChat from "./CoordinatorChat";
import Button from "../ui/Button";

export interface OfficeReceptionOverlayProps {
  open: boolean;
  onClose: () => void;
  orgUnitId?: string;
  productId?: string;
  parentRunId?: string;
  serviceId?: string | null;
  initialUserMessage?: string | null;
  welcomeMessageKey?: string;
  onExecuted?: () => void;
}

export default function OfficeReceptionOverlay({
  open,
  onClose,
  orgUnitId,
  productId,
  parentRunId,
  serviceId,
  initialUserMessage,
  welcomeMessageKey,
  onExecuted,
}: OfficeReceptionOverlayProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="office-reception-overlay" role="dialog" aria-modal="true" aria-labelledby="office-reception-title">
      <button
        type="button"
        className="office-reception-backdrop interactive"
        aria-label={t("office.reception.close")}
        onClick={onClose}
      />
      <div className="office-reception-panel">
        <header className="office-reception-header">
          <div>
            <p className="office-eyebrow">{t("office.chat.coordinatorName")}</p>
            <h2 id="office-reception-title" className="office-reception-title">
              {t("office.reception.title")}
            </h2>
            <p className="office-reception-subtitle">{t("office.floor.receptionHint")}</p>
          </div>
          <Button
            variant="secondary"
            onClick={onClose}
            aria-label={t("office.reception.close")}
          >
            <X className="h-4 w-4" aria-hidden />
            {t("office.reception.close")}
          </Button>
        </header>
        <div className="office-reception-chat">
          <CoordinatorChat
            orgUnitId={orgUnitId}
            productId={productId}
            parentRunId={parentRunId}
            serviceId={serviceId}
            initialUserMessage={initialUserMessage}
            welcomeMessageKey={welcomeMessageKey}
            onExecuted={onExecuted}
          />
        </div>
      </div>
    </div>
  );
}
