import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { PublicDeliveryPayload } from "../../lib/api";
import RichMarkdownView from "../ui/RichMarkdownView";
import Button from "../ui/Button";

interface DeliveryPreviewModalProps {
  open: boolean;
  payload: PublicDeliveryPayload | null;
  onClose: () => void;
}

export default function DeliveryPreviewModal({ open, payload, onClose }: DeliveryPreviewModalProps) {
  const { t } = useTranslation();
  if (!open || !payload) return null;

  const { branding, encargo } = payload;

  return (
    <div className="delivery-preview-overlay" role="dialog" aria-modal="true">
      <div className="delivery-preview-modal">
        <header className="delivery-preview-header" style={{ borderColor: branding.primaryColor }}>
          <div>
            <p className="delivery-preview-brand" style={{ color: branding.primaryColor }}>
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="" className="delivery-preview-logo" />
              ) : null}
              {branding.tenantName}
            </p>
            <h2>{encargo.title}</h2>
            {payload.label ? <p className="delivery-preview-label">{payload.label}</p> : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("common.close")}
          </Button>
        </header>
        <p className="delivery-preview-note">{t("office.encargos.delivery.previewNote")}</p>
        {branding.confidentialityNotice ? (
          <p className="delivery-preview-confidential">{branding.confidentialityNotice}</p>
        ) : null}
        <div className="delivery-preview-body">
          {payload.finalReport ? (
            <section>
              <h3>{t("office.encargos.tabFinal")}</h3>
              <RichMarkdownView value={payload.finalReport} />
            </section>
          ) : null}
          {payload.documents.map((doc) => (
            <section key={doc.id}>
              <h3>{doc.title}</h3>
              <RichMarkdownView value={doc.markdown} />
            </section>
          ))}
        </div>
        <footer className="delivery-preview-footer">
          {branding.footerText}
          <Link to="/settings?tab=delivery" className="office-link-btn">
            {t("office.encargos.delivery.editBranding")}
          </Link>
        </footer>
      </div>
    </div>
  );
}
