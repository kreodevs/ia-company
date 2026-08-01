import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Link2, Trash2 } from "lucide-react";
import { api, type EncargoDeliverySummary, type OfficeEncargoDocument } from "../../lib/api";
import Button from "../ui/Button";
import Input from "../ui/Input";

interface EncargoDeliveryPanelProps {
  runId: string;
  documents: OfficeEncargoDocument[];
  enabled: boolean;
}

export default function EncargoDeliveryPanel({
  runId,
  documents,
  enabled,
}: EncargoDeliveryPanelProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<EncargoDeliverySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const createLink = async () => {
    setBusy(true);
    try {
      await api.office.deliveries.create(runId, {
        label: label.trim() || undefined,
        includeFinalReport: true,
      });
      setLabel("");
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

  const copyUrl = async (item: EncargoDeliverySummary) => {
    await navigator.clipboard.writeText(item.publicUrl);
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  if (!enabled) return null;

  return (
    <section className="office-panel office-encargo-delivery-panel">
      <h2 className="office-panel-title">
        <Link2 className="h-4 w-4" aria-hidden />
        {t("office.encargos.delivery.title")}
      </h2>
      <p className="office-panel-subtitle">{t("office.encargos.delivery.subtitle")}</p>

      <div className="office-encargo-delivery-create">
        <Input
          label={t("office.encargos.delivery.labelOptional")}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t("office.encargos.delivery.labelPlaceholder")}
        />
        <Button size="sm" disabled={busy} onClick={() => void createLink()}>
          {t("office.encargos.delivery.create")}
        </Button>
      </div>

      {documents.length > 0 ? (
        <p className="office-encargo-delivery-hint">
          {t("office.encargos.delivery.documentsHint", { count: documents.length })}
        </p>
      ) : null}

      {loading ? (
        <p className="office-empty">{t("office.encargos.delivery.loading")}</p>
      ) : items.length === 0 ? (
        <p className="office-empty">{t("office.encargos.delivery.empty")}</p>
      ) : (
        <ul className="office-encargo-delivery-list">
          {items.map((item) => {
            const inactive = Boolean(item.revokedAt) || (item.expiresAt && new Date(item.expiresAt) < new Date());
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
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void revokeLink(item.id)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      {t("office.encargos.delivery.revoke")}
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
