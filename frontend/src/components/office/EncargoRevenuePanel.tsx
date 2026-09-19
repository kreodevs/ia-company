import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DollarSign } from "lucide-react";
import { api } from "../../lib/api";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { toast } from "../molecules/Sonner";

interface EncargoRevenuePanelProps {
  runId: string;
  productId: string | null;
  productName: string | null;
  linkedRevenueUsd: number | null;
  linkedRevenueAt: string | null;
  onRecorded?: () => void;
}

export default function EncargoRevenuePanel({
  runId,
  productId,
  productName,
  linkedRevenueUsd,
  linkedRevenueAt,
  onRecorded,
}: EncargoRevenuePanelProps) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (!productId) return null;

  const submit = async () => {
    const amountUsd = Number(amount);
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) return;
    setBusy(true);
    try {
      await api.office.recordEncargoRevenue(runId, {
        amountUsd,
        note: note.trim() || undefined,
      });
      toast(t("office.encargos.revenue.saved"));
      setAmount("");
      setNote("");
      onRecorded?.();
    } catch (err) {
      toast(t("office.encargos.revenue.error"), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="office-panel office-encargo-revenue-panel">
      <h2 className="office-panel-title">
        <DollarSign className="h-4 w-4" aria-hidden />
        {t("office.encargos.revenue.title")}
      </h2>
      <p className="office-panel-subtitle">
        {t("office.encargos.revenue.subtitle", { product: productName ?? productId })}
      </p>

      {linkedRevenueUsd != null ? (
        <p className="office-encargo-revenue-recorded">
          {t("office.encargos.revenue.linked", {
            amount: linkedRevenueUsd.toFixed(2),
            date: linkedRevenueAt
              ? new Date(linkedRevenueAt).toLocaleString()
              : t("office.encargos.revenue.justNow"),
          })}
        </p>
      ) : (
        <>
          <div className="office-encargo-revenue-form">
            <Input
              label={t("office.encargos.revenue.amountLabel")}
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            <Input
              label={t("office.encargos.revenue.noteOptional")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("office.encargos.revenue.notePlaceholder")}
            />
            <Button size="sm" disabled={busy || !amount.trim()} onClick={() => void submit()}>
              {t("office.encargos.revenue.save")}
            </Button>
          </div>
          <p className="office-encargo-delivery-hint">
            <Link to={`/products/${productId}/settings?tab=revenue`} className="office-link-btn">
              {t("office.encargos.revenue.productSettings")}
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
