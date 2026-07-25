import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import { toast } from "../molecules/Sonner";
import { translateApiError } from "../../lib/translate-error";
import Panel from "../ui/Panel";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { Switch } from "../atoms/Switch";

export default function ProductIntegrationsPanel({ productId }: { productId: string }) {
  const { t } = useTranslation();
  const [theforgeProjectId, setTheforgeProjectId] = useState("");
  const [supportRagMcpSlug, setSupportRagMcpSlug] = useState("");
  const [autoDispatchSpec, setAutoDispatchSpec] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.products
      .integrations(productId)
      .then((res) => {
        setTheforgeProjectId(res.form.theforgeProjectId ?? "");
        setSupportRagMcpSlug(res.form.supportRagMcpSlug ?? "");
        setAutoDispatchSpec(Boolean(res.form.autoDispatchSpec));
      })
      .catch((err) => toast.error(translateApiError(err, t, "common.requestFailed")))
      .finally(() => setLoading(false));
  }, [productId, t]);

  const save = async () => {
    setSaving(true);
    try {
      await api.products.updateIntegrations(productId, {
        theforgeProjectId,
        supportRagMcpSlug,
        autoDispatchSpec,
      });
      toast.success(t("products.settings.integrations.saved"));
    } catch (err) {
      toast.error(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;
  }

  return (
    <Panel className="space-y-4 max-w-xl">
      <div>
        <h3 className="text-sm font-semibold">{t("products.settings.integrations.title")}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("products.settings.integrations.subtitle")}
        </p>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium" htmlFor="theforge-id">
            {t("products.settings.integrations.theforgeId")}
          </label>
          <Input
            id="theforge-id"
            value={theforgeProjectId}
            onChange={(e) => setTheforgeProjectId(e.target.value)}
            placeholder="TheForge project UUID"
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="rag-slug">
            {t("products.settings.integrations.ragSlug")}
          </label>
          <Input
            id="rag-slug"
            value={supportRagMcpSlug}
            onChange={(e) => setSupportRagMcpSlug(e.target.value)}
            placeholder="support-rag"
          />
        </div>
        <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-3">
          <div>
            <p className="text-sm font-medium">{t("products.settings.integrations.autoDispatchSpec")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("products.settings.integrations.autoDispatchSpecHint")}
            </p>
          </div>
          <Switch
            checked={autoDispatchSpec}
            onCheckedChange={setAutoDispatchSpec}
            aria-label={t("products.settings.integrations.autoDispatchSpec")}
          />
        </div>
      </div>
      <Button onClick={save} disabled={saving}>
        {saving ? t("common.saving") : t("common.save")}
      </Button>
    </Panel>
  );
}
