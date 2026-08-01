import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Copy, Eye, Link2, Mail, RefreshCw, Trash2 } from "lucide-react";
import {
  api,
  type EncargoDeliverySummary,
  type OfficeEncargoDocument,
  type PublicDeliveryPayload,
} from "../../lib/api";
import Button from "../ui/Button";
import Input from "../ui/Input";
import DeliveryPreviewModal from "./DeliveryPreviewModal";

interface EncargoDeliveryPanelProps {
  runId: string;
  documents: OfficeEncargoDocument[];
  hasFinalReport: boolean;
  enabled: boolean;
}

type ExpiryPreset = "never" | "7d" | "30d" | "90d";

export default function EncargoDeliveryPanel({
  runId,
  documents,
  hasFinalReport,
  enabled,
}: EncargoDeliveryPanelProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<EncargoDeliverySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("");
  const [expiryPreset, setExpiryPreset] = useState<ExpiryPreset>("30d");
  const [includeFinalReport, setIncludeFinalReport] = useState(hasFinalReport);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(() => documents.map((d) => d.id));
  const [confirmedShare, setConfirmedShare] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPayload, setPreviewPayload] = useState<PublicDeliveryPayload | null>(null);
  const [emailForId, setEmailForId] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  const createBody = useMemo(
    () => ({
      label: label.trim() || undefined,
      expiryPreset,
      includeFinalReport,
      documentIds: selectedDocIds,
    }),
    [label, expiryPreset, includeFinalReport, selectedDocIds],
  );

  const refresh = useCallback(async () => {
    const data = await api.office.deliveries.list(runId);
    setItems(data.items);
  }, [runId]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh()
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [enabled, refresh]);

  useEffect(() => {
    setSelectedDocIds(documents.map((d) => d.id));
    setIncludeFinalReport(hasFinalReport);
  }, [documents, hasFinalReport]);

  const toggleDoc = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId],
    );
  };

  const openPreview = async () => {
    setBusy(true);
    try {
      const payload = await api.office.deliveries.preview(runId, createBody);
      setPreviewPayload(payload);
      setPreviewOpen(true);
    } finally {
      setBusy(false);
    }
  };

  const createLink = async () => {
    if (!confirmedShare) return;
    setBusy(true);
    try {
      await api.office.deliveries.create(runId, createBody);
      setLabel("");
      setConfirmedShare(false);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const revokeLink = async (deliveryId: string) => {
    setBusy(true);
    try {
      await api.office.deliveries.revoke(runId, deliveryId);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const rotateLink = async (deliveryId: string) => {
    setBusy(true);
    try {
      await api.office.deliveries.rotate(runId, deliveryId);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const sendEmail = async (deliveryId: string) => {
    if (!emailTo.trim()) return;
    setBusy(true);
    try {
      await api.office.deliveries.sendEmail(runId, deliveryId, {
        to: emailTo.trim(),
        message: emailMessage.trim() || undefined,
      });
      setEmailForId(null);
      setEmailTo("");
      setEmailMessage("");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const copyUrl = async (item: EncargoDeliverySummary) => {
    const message = t("office.encargos.delivery.copyMessage", { url: item.publicUrl });
    await navigator.clipboard.writeText(message);
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  if (!enabled) return null;

  const canCreate =
    confirmedShare && (includeFinalReport || selectedDocIds.length > 0) && !busy;

  return (
    <section className="office-panel office-encargo-delivery-panel">
      <h2 className="office-panel-title">
        <Link2 className="h-4 w-4" aria-hidden />
        {t("office.encargos.delivery.title")}
      </h2>
      <p className="office-panel-subtitle">{t("office.encargos.delivery.subtitle")}</p>
      <p className="office-encargo-delivery-settings-link">
        <Link to="/settings?tab=delivery" className="office-link-btn">
          {t("office.encargos.delivery.editBranding")}
        </Link>
      </p>

      <div className="office-encargo-delivery-form">
        <Input
          label={t("office.encargos.delivery.labelOptional")}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t("office.encargos.delivery.labelPlaceholder")}
        />

        <label className="office-encargo-delivery-field">
          <span>{t("office.encargos.delivery.expiryLabel")}</span>
          <select
            value={expiryPreset}
            onChange={(e) => setExpiryPreset(e.target.value as ExpiryPreset)}
          >
            <option value="7d">{t("office.encargos.delivery.expiry7d")}</option>
            <option value="30d">{t("office.encargos.delivery.expiry30d")}</option>
            <option value="90d">{t("office.encargos.delivery.expiry90d")}</option>
            <option value="never">{t("office.encargos.delivery.expiryNever")}</option>
          </select>
        </label>

        {hasFinalReport ? (
          <label className="office-encargo-delivery-check">
            <input
              type="checkbox"
              checked={includeFinalReport}
              onChange={(e) => setIncludeFinalReport(e.target.checked)}
            />
            {t("office.encargos.delivery.includeSummary")}
          </label>
        ) : null}

        {documents.length > 0 ? (
          <fieldset className="office-encargo-delivery-docs">
            <legend>{t("office.encargos.delivery.documentsField")}</legend>
            {documents.map((doc) => (
              <label key={doc.id} className="office-encargo-delivery-check">
                <input
                  type="checkbox"
                  checked={selectedDocIds.includes(doc.id)}
                  onChange={() => toggleDoc(doc.id)}
                />
                {doc.title}
              </label>
            ))}
          </fieldset>
        ) : null}

        <label className="office-encargo-delivery-check office-encargo-delivery-legal">
          <input
            type="checkbox"
            checked={confirmedShare}
            onChange={(e) => setConfirmedShare(e.target.checked)}
          />
          {t("office.encargos.delivery.shareConfirm")}
        </label>

        <div className="office-encargo-delivery-create-actions">
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => void openPreview()}>
            <Eye className="h-4 w-4" aria-hidden />
            {t("office.encargos.delivery.preview")}
          </Button>
          <Button size="sm" disabled={!canCreate} onClick={() => void createLink()}>
            {t("office.encargos.delivery.create")}
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="office-empty">{t("office.encargos.delivery.loading")}</p>
      ) : items.length === 0 ? (
        <p className="office-empty">{t("office.encargos.delivery.empty")}</p>
      ) : (
        <ul className="office-encargo-delivery-list">
          {items.map((item) => {
            const inactive =
              Boolean(item.revokedAt) ||
              (item.expiresAt ? new Date(item.expiresAt) < new Date() : false);
            return (
              <li key={item.id} className="office-encargo-delivery-row" data-inactive={inactive || undefined}>
                <div>
                  <p className="office-encargo-delivery-row-label">
                    {item.label || t("office.encargos.delivery.unnamed")}
                  </p>
                  <p className="office-encargo-delivery-row-meta">
                    {new Date(item.createdAt).toLocaleString()}
                    {item.revokedAt ? ` · ${t("office.encargos.delivery.revoked")}` : null}
                    {item.expiresAt && !item.revokedAt
                      ? ` · ${t("office.encargos.delivery.expires", {
                          date: new Date(item.expiresAt).toLocaleString(),
                        })}`
                      : null}
                    {item.viewCount > 0
                      ? ` · ${t("office.encargos.delivery.views", { count: item.viewCount })}`
                      : null}
                    {item.firstViewedAt
                      ? ` · ${t("office.encargos.delivery.firstView", {
                          date: new Date(item.firstViewedAt).toLocaleString(),
                        })}`
                      : null}
                    {item.emailedAt
                      ? ` · ${t("office.encargos.delivery.emailed", { email: item.recipientEmail ?? "" })}`
                      : null}
                  </p>
                  <a href={item.publicUrl} className="office-encargo-delivery-url" target="_blank" rel="noreferrer">
                    {item.publicUrl}
                  </a>
                </div>
                <div className="office-encargo-delivery-row-actions">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={Boolean(item.revokedAt)}
                    onClick={() => void copyUrl(item)}
                  >
                    <Copy className="h-4 w-4" aria-hidden />
                    {copiedId === item.id
                      ? t("office.encargos.delivery.copied")
                      : t("office.encargos.delivery.copy")}
                  </Button>
                  {!item.revokedAt ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setEmailForId(emailForId === item.id ? null : item.id)}
                      >
                        <Mail className="h-4 w-4" aria-hidden />
                        {t("office.encargos.delivery.email")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => void rotateLink(item.id)}
                      >
                        <RefreshCw className="h-4 w-4" aria-hidden />
                        {t("office.encargos.delivery.rotate")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => void revokeLink(item.id)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                        {t("office.encargos.delivery.revoke")}
                      </Button>
                    </>
                  ) : null}
                </div>
                {emailForId === item.id ? (
                  <div className="office-encargo-delivery-email-form">
                    <Input
                      label={t("office.encargos.delivery.emailTo")}
                      type="email"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                    />
                    <Input
                      label={t("office.encargos.delivery.emailMessage")}
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      placeholder={t("office.encargos.delivery.emailMessagePlaceholder")}
                    />
                    <Button size="sm" disabled={busy || !emailTo.trim()} onClick={() => void sendEmail(item.id)}>
                      {t("office.encargos.delivery.sendEmail")}
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <DeliveryPreviewModal
        open={previewOpen}
        payload={previewPayload}
        onClose={() => setPreviewOpen(false)}
      />
    </section>
  );
}
