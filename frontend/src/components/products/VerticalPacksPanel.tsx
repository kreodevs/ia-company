import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Box, CheckCircle2, Loader2 } from "lucide-react";
import { api, type VerticalPackListItem } from "../../lib/api";
import { translateApiError } from "../../lib/translate-error";
import { toast } from "../molecules/Sonner";
import Button from "../ui/Button";
import Panel from "../ui/Panel";
import StatusPill from "../ui/StatusPill";

export default function VerticalPacksPanel({ onApplied }: { onApplied?: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [packs, setPacks] = useState<VerticalPackListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { packs: next } = await api.products.verticalPacks();
      setPacks(next);
    } catch {
      setPacks([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const applyPack = async (pack: VerticalPackListItem) => {
    setApplyingId(pack.id);
    try {
      const result = await api.products.applyVerticalPack(pack.id);
      toast.success(t("products.verticalPacks.toastApplied", { name: result.productName }));
      onApplied?.();
      await load();
      navigate(`/war-room/${result.productId}`);
    } catch (err) {
      toast.error(translateApiError(err, t, "products.verticalPacks.toastFailed"));
    } finally {
      setApplyingId(null);
    }
  };

  if (loading) {
    return (
      <Panel title={t("products.verticalPacks.title")} subtitle={t("products.verticalPacks.subtitle")}>
        <p className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("products.verticalPacks.loading")}
        </p>
      </Panel>
    );
  }

  if (packs.length === 0) {
    return (
      <Panel title={t("products.verticalPacks.title")} subtitle={t("products.verticalPacks.subtitle")}>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {loadError
            ? t("products.verticalPacks.loadFailed")
            : t("products.verticalPacks.empty")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel title={t("products.verticalPacks.title")} subtitle={t("products.verticalPacks.subtitle")}>
      <ul className="space-y-3">
        {packs.map((pack) => (
          <li
            key={pack.id}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Box className="h-4 w-4 text-[var(--color-primary)]" aria-hidden />
                  <span className="font-semibold">{pack.name}</span>
                  {pack.applied && (
                    <StatusPill status="completed">
                      <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden />
                      {t("products.verticalPacks.applied")}
                    </StatusPill>
                  )}
                  {pack.hasCode && (
                    <span className="text-[10px] font-semibold uppercase text-[var(--color-muted-foreground)]">
                      {t("products.verticalPacks.hasCode")}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--color-muted-foreground)]">{pack.tagline}</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {t("products.verticalPacks.meta", {
                    workflows: pack.workflowCount,
                    presets: pack.presetCount,
                    slug: pack.productSlug,
                  })}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {pack.applied && pack.appliedProductId ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/war-room/${pack.appliedProductId}`)}
                  >
                    {t("products.verticalPacks.openWarRoom")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={applyingId === pack.id}
                    onClick={() => void applyPack(pack)}
                  >
                    {applyingId === pack.id
                      ? t("products.verticalPacks.applying")
                      : t("products.verticalPacks.apply")}
                  </Button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
