import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, DollarSign } from "lucide-react";
import { api, type ProductRevenueSettings } from "../../lib/api";
import { toast } from "../molecules/Sonner";
import { translateApiError } from "../../lib/translate-error";
import Panel from "../ui/Panel";
import Input from "../ui/Input";
import Button from "../ui/Button";

interface ProductRevenueSettingsPanelProps {
  productId: string;
  onSaved?: () => void;
}

export default function ProductRevenueSettingsPanel({
  productId,
  onSaved,
}: ProductRevenueSettingsPanelProps) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<ProductRevenueSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revenueUsd, setRevenueUsd] = useState("0");
  const [stripeSecret, setStripeSecret] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.products.revenueSettings(productId);
      setSettings(data);
      setRevenueUsd(String(data.revenueUsd));
      setStripeSecret("");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty =
    settings != null &&
    (Number(revenueUsd) !== settings.revenueUsd || stripeSecret.trim().length > 0);

  const save = async () => {
    setSaving(true);
    try {
      const body: {
        revenueUsd: number;
        stripeWebhookSecret?: string | null;
      } = {
        revenueUsd: Math.max(0, Number(revenueUsd) || 0),
      };
      if (stripeSecret.trim()) {
        body.stripeWebhookSecret = stripeSecret.trim();
      }
      await api.products.update(productId, body);
      toast.success(t("products.settings.revenue.saved"));
      await load();
      onSaved?.();
    } catch (err) {
      toast.error(translateApiError(err, t, "common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const copyWebhookUrl = async () => {
    if (!settings?.webhookUrl) return;
    try {
      await navigator.clipboard.writeText(settings.webhookUrl);
      toast.success(t("products.settings.revenue.webhookCopied"));
    } catch {
      toast.error(t("common.copyFailed", { defaultValue: "Could not copy" }));
    }
  };

  const copyWaitlistUrl = async () => {
    if (!settings?.waitlistWebhookUrl) return;
    try {
      await navigator.clipboard.writeText(settings.waitlistWebhookUrl);
      toast.success(t("products.settings.revenue.waitlistCopied"));
    } catch {
      toast.error(t("common.copyFailed", { defaultValue: "Could not copy" }));
    }
  };

  const copyWaitlistKey = async () => {
    if (!settings?.waitlistApiKey) return;
    try {
      await navigator.clipboard.writeText(settings.waitlistApiKey);
      toast.success(t("products.settings.revenue.waitlistCopied"));
    } catch {
      toast.error(t("common.copyFailed", { defaultValue: "Could not copy" }));
    }
  };

  if (loading) {
    return (
      <Panel title={t("products.settings.revenue.title")} subtitle={t("products.settings.revenue.subtitle")}>
        <p className="text-sm text-[var(--color-muted-foreground)]">{t("common.loading")}</p>
      </Panel>
    );
  }

  if (!settings) return null;

  return (
    <Panel title={t("products.settings.revenue.title")} subtitle={t("products.settings.revenue.subtitle")}>
      <div className="space-y-4">
        <Input
          label={t("products.settings.revenue.revenueLabel")}
          type="number"
          min={0}
          step="0.01"
          value={revenueUsd}
          onChange={(e) => setRevenueUsd(e.target.value)}
          disabled={saving}
        />

        <div>
          <Input
            label={t("products.settings.revenue.stripeSecretLabel")}
            type="password"
            value={stripeSecret}
            onChange={(e) => setStripeSecret(e.target.value)}
            placeholder={
              settings.stripeWebhookConfigured
                ? t("products.settings.revenue.stripeSecretConfigured")
                : "whsec_…"
            }
            disabled={saving}
          />
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            {t("products.settings.revenue.stripeSecretHint")}
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {t("products.settings.revenue.webhookUrlLabel")}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="flex-1 break-all text-xs">{settings.webhookUrl}</code>
            <Button type="button" variant="secondary" onClick={() => void copyWebhookUrl()}>
              <Copy className="h-4 w-4" aria-hidden />
              {t("common.copy", { defaultValue: "Copy" })}
            </Button>
          </div>
          <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
            {t("products.settings.revenue.webhookHint")}
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3" id="revenue">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {t("products.settings.revenue.waitlistTitle")}
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            {t("products.settings.revenue.waitlistHint")}
          </p>
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {t("products.settings.revenue.waitlistUrlLabel")}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <code className="flex-1 break-all text-xs">{settings.waitlistWebhookUrl}</code>
                <Button type="button" variant="secondary" onClick={() => void copyWaitlistUrl()}>
                  <Copy className="h-4 w-4" aria-hidden />
                  {t("common.copy", { defaultValue: "Copy" })}
                </Button>
              </div>
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {t("products.settings.revenue.waitlistKeyLabel")}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <code className="flex-1 break-all text-xs">{settings.waitlistApiKey}</code>
                <Button type="button" variant="secondary" onClick={() => void copyWaitlistKey()}>
                  <Copy className="h-4 w-4" aria-hidden />
                  {t("common.copy", { defaultValue: "Copy" })}
                </Button>
              </div>
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {t("products.settings.revenue.waitlistExample")}
            </p>
          </div>
        </div>

        {(settings.revenueLastSyncedAt || settings.revenueSource) && (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {settings.revenueLastSyncedAt && (
              <div>
                <dt className="text-[var(--color-muted-foreground)]">
                  {t("products.settings.revenue.lastSynced")}
                </dt>
                <dd>{new Date(settings.revenueLastSyncedAt).toLocaleString()}</dd>
              </div>
            )}
            {settings.revenueSource && (
              <div>
                <dt className="text-[var(--color-muted-foreground)]">
                  {t("products.settings.revenue.lastSource")}
                </dt>
                <dd className="font-mono text-xs">{settings.revenueSource}</dd>
              </div>
            )}
          </dl>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void save()} disabled={saving || !dirty}>
            <DollarSign className="h-4 w-4" aria-hidden />
            {saving ? t("common.saving") : t("common.save")}
          </Button>
          {settings.stripeWebhookConfigured && !stripeSecret && (
            <span className="text-xs text-[var(--color-primary)]">
              {t("products.settings.revenue.stripeReady")}
            </span>
          )}
        </div>
      </div>
    </Panel>
  );
}
