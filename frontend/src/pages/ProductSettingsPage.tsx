import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ExternalLink, RefreshCw, Settings2 } from "lucide-react";
import { api, type TenantProduct } from "../lib/api";
import { toast } from "../components/molecules/Sonner";
import { translateApiError } from "../lib/translate-error";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Panel from "../components/ui/Panel";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import ProductActionsMenu from "../components/ui/ProductActionsMenu";
import ProductOpencodeSettingsPanel from "../components/opencode/ProductOpencodeSettingsPanel";
import ProductRevenueSettingsPanel from "../components/products/ProductRevenueSettingsPanel";
import Select from "../components/ui/Select";
import type { OrgUnit } from "../lib/org-types";

function productPhaseLabel(
  phase: TenantProduct["phase"],
  t: (key: string) => string,
): string {
  return t(`products.active.phase.${phase}`);
}

export default function ProductSettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams<{ productId: string }>();
  const productId = params.productId;

  const [product, setProduct] = useState<TenantProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [intakeBusy, setIntakeBusy] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [orgUnitId, setOrgUnitId] = useState("");
  const [workItemKind, setWorkItemKind] = useState("product");
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const list = await api.products.list();
      const [found, units] = await Promise.all([
        Promise.resolve(list.find((p) => p.id === productId) ?? null),
        api.orgUnits.list().catch(() => [] as OrgUnit[]),
      ]);
      setOrgUnits(units);
      setProduct(found);
      if (found) {
        setName(found.name);
        setDescription(found.description ?? "");
        setGithubRepoUrl(found.githubRepoUrl ?? "");
        setOrgUnitId(found.orgUnitId ?? "");
        setWorkItemKind(found.workItemKind ?? "product");
      }
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => {
    if (!product) return false;
    return (
      name.trim() !== product.name ||
      description.trim() !== (product.description ?? "") ||
      githubRepoUrl.trim() !== (product.githubRepoUrl ?? "") ||
      orgUnitId !== (product.orgUnitId ?? "") ||
      workItemKind !== (product.workItemKind ?? "product")
    );
  }, [product, name, description, githubRepoUrl, orgUnitId, workItemKind]);

  const save = async () => {
    if (!productId || !product) return;
    setSaving(true);
    try {
      const updated = await api.products.update(productId, {
        name: name.trim(),
        description: description.trim() || undefined,
        githubRepoUrl: githubRepoUrl.trim() || undefined,
        orgUnitId: orgUnitId || null,
        workItemKind: workItemKind as "product" | "client" | "campaign" | "project",
      });
      setProduct(updated);
      setName(updated.name);
      setDescription(updated.description ?? "");
      setGithubRepoUrl(updated.githubRepoUrl ?? "");
      setOrgUnitId(updated.orgUnitId ?? "");
      setWorkItemKind(updated.workItemKind ?? "product");
      toast.success(t("products.settings.saved"));
    } catch (err) {
      toast.error(translateApiError(err, t, "common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const rerunIntake = async () => {
    if (!productId) return;
    setIntakeBusy(true);
    try {
      const result = await api.products.startIntake(productId);
      toast.success(t("products.settings.intakeStarted"));
      navigate(`/war-room/${productId}?run=${encodeURIComponent(result.runId)}`);
    } catch (err) {
      toast.error(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setIntakeBusy(false);
    }
  };

  if (loading) return <PageLoading message={t("products.settings.loading")} />;
  if (!productId || !product) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-sm text-[var(--color-muted-foreground)]">{t("products.settings.notFound")}</p>
        <Link to="/products?tab=active" className="text-[var(--color-primary)] hover:underline">
          {t("products.title")}
        </Link>
      </div>
    );
  }

  const intakeStatus = product.intakeStatus ?? "skipped";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow={
          <Breadcrumbs
            items={[
              { label: t("products.title"), to: "/products?tab=active" },
              { label: t("products.settings.title") },
            ]}
          />
        }
        title={t("products.settings.pageTitle", { name: product.name })}
        subtitle={t("products.settings.subtitle")}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{productPhaseLabel(product.phase, t)}</Badge>
            <ProductActionsMenu product={product} onChange={() => void load()} />
            <Link
              to={`/war-room/${product.id}`}
              className="rounded-full border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20"
            >
              {t("products.active.warRoom")}
            </Link>
            <Link
              to={`/products/${product.id}/code`}
              className="text-xs text-[var(--color-primary)] hover:underline"
            >
              {t("products.active.code")} →
            </Link>
          </div>
        }
      />

      <Panel title={t("products.settings.generalTitle")} subtitle={t("products.settings.generalSubtitle")}>
        <div className="space-y-4">
          <Input
            label={t("products.add.nameLabel")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
          />
          <Input
            label={t("products.add.descriptionLabel")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("products.add.descriptionPlaceholder")}
            disabled={saving}
          />
          <div>
            <Input
              label={t("products.add.githubUrlLabel")}
              value={githubRepoUrl}
              onChange={(e) => setGithubRepoUrl(e.target.value)}
              placeholder="https://github.com/org/repo"
              disabled={saving}
            />
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              {t("products.add.githubUrlHint")}{" "}
              <Link to="/settings?tab=integrations" className="text-[var(--color-primary)] hover:underline">
                {t("products.settings.integrationsLink")}
              </Link>
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
              {t("products.settings.orgUnitLabel")}
            </label>
            <Select
              value={orgUnitId}
              onChange={setOrgUnitId}
              ariaLabel={t("products.settings.orgUnitLabel")}
              options={[
                { value: "", label: t("products.settings.orgUnitNone") },
                ...orgUnits.map((u) => ({ value: u.id, label: u.name })),
              ]}
            />
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              {t("products.settings.orgUnitHint")}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
              {t("products.settings.workItemKindLabel")}
            </label>
            <Select
              value={workItemKind}
              onChange={setWorkItemKind}
              ariaLabel={t("products.settings.workItemKindLabel")}
              options={[
                { value: "product", label: t("products.settings.workItemKind.product") },
                { value: "client", label: t("products.settings.workItemKind.client") },
                { value: "campaign", label: t("products.settings.workItemKind.campaign") },
                { value: "project", label: t("products.settings.workItemKind.project") },
              ]}
            />
          </div>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {t("products.settings.slugReadonly", { slug: product.slug, path: `projects/${product.slug}/` })}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void save()} disabled={saving || !dirty || !name.trim()}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
            {!dirty && (
              <span className="text-xs text-[var(--color-muted-foreground)]">
                {t("products.settings.noChanges")}
              </span>
            )}
          </div>
        </div>
      </Panel>

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
        {product.intakeRunId && (
          <p className="mb-3 text-xs text-[var(--color-muted-foreground)]">
            {t("products.settings.lastIntakeRun")}{" "}
            <Link
              to={`/office/encargos/${product.intakeRunId}`}
              className="text-[var(--color-primary)] hover:underline"
            >
              {product.intakeRunId.slice(0, 8)}…
            </Link>
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => void rerunIntake()}
            disabled={intakeBusy}
          >
            <RefreshCw className={`h-4 w-4 ${intakeBusy ? "animate-spin" : ""}`} aria-hidden />
            {intakeBusy ? t("products.settings.intakeRunning") : t("products.settings.rerunIntake")}
          </Button>
          {!githubRepoUrl.trim() && (
            <p className="w-full text-xs text-amber-600 dark:text-amber-300">
              {t("products.settings.intakeNeedsGithub")}
            </p>
          )}
        </div>
      </Panel>

      <ProductRevenueSettingsPanel productId={productId} onSaved={() => void load()} />

      <div id="opencode">
        <ProductOpencodeSettingsPanel productId={productId} />
      </div>

      <p className="text-xs text-[var(--color-muted-foreground)]">
        <Settings2 className="mr-1 inline h-3.5 w-3.5" aria-hidden />
        {t("products.settings.debugHint")}{" "}
        <Link
          to={`/debug/products/${productId}/consensus`}
          className="inline-flex items-center gap-0.5 text-[var(--color-primary)] hover:underline"
        >
          {t("products.settings.debugConsensusLink")}
          <ExternalLink className="h-3 w-3" aria-hidden />
        </Link>
      </p>
    </div>
  );
}
