import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { api, type ProductIntakeDocument, type ProductIntakeStatus, type TenantProduct } from "../../lib/api";
import { toast } from "../molecules/Sonner";
import { translateApiError } from "../../lib/translate-error";
import Panel from "../ui/Panel";
import Button from "../ui/Button";
import MarkdownView from "../ui/MarkdownView";

function formatVersionDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function ProductIntakePreviewPanel({
  product,
  onRerunIntake,
  intakeBusy,
}: {
  product: TenantProduct;
  onRerunIntake: () => Promise<void>;
  intakeBusy: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [doc, setDoc] = useState<ProductIntakeDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const next = await api.products.intakeDocument(product.id);
      setDoc(next);
      setSelectedVersionId((prev) => {
        if (prev && next.versions.some((v) => v.id === prev)) return prev;
        return next.versions[0]?.id ?? null;
      });
    } catch (err) {
      toast.error(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setLoading(false);
    }
  }, [product.id, t]);

  useEffect(() => {
    void reload();
  }, [reload, product.intakeStatus, product.intakeRunId]);

  const selectedVersion = useMemo(() => {
    if (!doc?.versions.length) return null;
    return doc.versions.find((v) => v.id === selectedVersionId) ?? doc.versions[0] ?? null;
  }, [doc, selectedVersionId]);

  const intakeStatus = (doc?.intakeStatus ?? product.intakeStatus ?? "skipped") as ProductIntakeStatus;
  const showVersionList = (doc?.versions.length ?? 0) > 1;

  return (
    <Panel title={t("products.settings.intakeTitle")} subtitle={t("products.settings.intakeSubtitle")}>
      <dl className="mb-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {t("products.settings.intakeStatusLabel")}
          </dt>
          <dd className="mt-0.5 font-medium">{t(`products.settings.intakeStatus.${intakeStatus}`)}</dd>
        </div>
        {product.githubDefaultBranch && (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              {t("products.settings.defaultBranch")}
            </dt>
            <dd className="mt-0.5 font-mono text-sm">{product.githubDefaultBranch}</dd>
          </div>
        )}
      </dl>

      {(doc?.intakeRunId ?? product.intakeRunId) && (
        <p className="mb-4 text-xs text-[var(--color-muted-foreground)]">
          {t("products.settings.lastIntakeRun")}{" "}
          <Link
            to={`/office/encargos/${doc?.intakeRunId ?? product.intakeRunId}`}
            className="text-[var(--color-primary)] hover:underline"
          >
            {(doc?.intakeRunId ?? product.intakeRunId)!.slice(0, 8)}…
          </Link>
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => void onRerunIntake()} disabled={intakeBusy}>
          <RefreshCw className={`h-4 w-4 ${intakeBusy ? "animate-spin" : ""}`} aria-hidden />
          {intakeBusy ? t("products.settings.intakeRunning") : t("products.settings.rerunIntake")}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">{t("products.settings.intakePreviewLoading")}</p>
      ) : selectedVersion ? (
        <div className={`grid gap-4 ${showVersionList ? "lg:grid-cols-[1fr_220px]" : ""}`}>
          <div className="min-w-0 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              {t("products.settings.intakePreviewTitle")}
            </h3>
            <MarkdownView
              value={selectedVersion.markdown}
              ariaLabel={t("products.settings.intakePreviewTitle")}
              emptyMessage={t("products.settings.intakePreviewEmpty")}
            />
          </div>
          {showVersionList ? (
            <aside className="space-y-2 lg:border-l lg:border-[var(--color-border)] lg:pl-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                {t("products.settings.intakeVersionsTitle")}
              </h3>
              <ul className="space-y-1">
                {doc!.versions.map((version, index) => {
                  const isLatest = index === 0;
                  const isSelected = version.id === selectedVersion.id;
                  return (
                    <li key={version.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedVersionId(version.id)}
                        className={`interactive w-full rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                          isSelected
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-foreground)]"
                            : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)] hover:border-[var(--color-primary)]/40"
                        }`}
                      >
                        <span className="block font-medium text-[var(--color-foreground)]">
                          {isLatest
                            ? t("products.settings.intakeVersionLatest")
                            : t("products.settings.intakeVersionLabel", {
                                date: formatVersionDate(version.createdAt, i18n.language),
                              })}
                        </span>
                        <span className="mt-0.5 block text-[10px] opacity-80">
                          {formatVersionDate(version.createdAt, i18n.language)}
                        </span>
                        {version.runId ? (
                          <Link
                            to={`/office/encargos/${version.runId}`}
                            className="mt-1 inline-block text-[10px] text-[var(--color-primary)] hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {t("productDesk.viewRun")}
                          </Link>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>
          ) : null}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
          {intakeStatus === "running" || intakeStatus === "pending"
            ? t("products.settings.intakePreviewPending")
            : t("products.settings.intakePreviewEmpty")}
        </p>
      )}
    </Panel>
  );
}
