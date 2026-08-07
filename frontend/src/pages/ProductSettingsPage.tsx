import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";
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
import TabsBar from "../components/ui/TabsBar";
import ProductActionsMenu from "../components/ui/ProductActionsMenu";
import ProductOpencodeSettingsPanel from "../components/opencode/ProductOpencodeSettingsPanel";
import ProductRevenueSettingsPanel from "../components/products/ProductRevenueSettingsPanel";
import ProductIntegrationsPanel from "../components/products/ProductIntegrationsPanel";
import ProductIntakePreviewPanel from "../components/products/ProductIntakePreviewPanel";
import Select from "../components/ui/Select";
import type { OrgUnit } from "../lib/org-types";

const VALID_TABS = ["general", "intake", "revenue", "opencode", "integrations"] as const;
type ProductSettingsTab = (typeof VALID_TABS)[number];

function parseSettingsTab(searchParams: URLSearchParams): ProductSettingsTab {
  const fromQuery = searchParams.get("tab");
  if (fromQuery && VALID_TABS.includes(fromQuery as ProductSettingsTab)) {
    return fromQuery as ProductSettingsTab;
  }
  const hash =
    typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
  if (hash && VALID_TABS.includes(hash as ProductSettingsTab)) {
    return hash as ProductSettingsTab;
  }
  return "general";
}

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<ProductSettingsTab>(() =>
    parseSettingsTab(searchParams),
  );

  const [product, setProduct] = useState<TenantProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [intakeBusy, setIntakeBusy] = useState(false);
  const [webRefreshBusy, setWebRefreshBusy] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [pricingPageUrl, setPricingPageUrl] = useState("");
  const [orgUnitId, setOrgUnitId] = useState("");
  const [workItemKind, setWorkItemKind] = useState("product");
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);

  const setTab = (next: ProductSettingsTab) => {
    setActiveTab(next);
    setSearchParams(next === "general" ? {} : { tab: next }, { replace: true });
  };

  useEffect(() => {
    const tab = parseSettingsTab(searchParams);
    setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash && VALID_TABS.includes(hash as ProductSettingsTab) && !searchParams.get("tab")) {
      setSearchParams({ tab: hash }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
        setWebsiteUrl(found.websiteUrl ?? "");
        setPricingPageUrl(found.pricingPageUrl ?? "");
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
      websiteUrl.trim() !== (product.websiteUrl ?? "") ||
      pricingPageUrl.trim() !== (product.pricingPageUrl ?? "") ||
      orgUnitId !== (product.orgUnitId ?? "") ||
      workItemKind !== (product.workItemKind ?? "product")
    );
  }, [product, name, description, githubRepoUrl, websiteUrl, pricingPageUrl, orgUnitId, workItemKind]);

  const save = async () => {
    if (!productId || !product) return;
    setSaving(true);
    try {
      const updated = await api.products.update(productId, {
        name: name.trim(),
        description: description.trim() || undefined,
        githubRepoUrl: githubRepoUrl.trim() || undefined,
        websiteUrl: websiteUrl.trim() || null,
        pricingPageUrl: pricingPageUrl.trim() || null,
        orgUnitId: orgUnitId || null,
        workItemKind: workItemKind as "product" | "client" | "campaign" | "project",
      });
      setProduct(updated);
      setName(updated.name);
      setDescription(updated.description ?? "");
      setGithubRepoUrl(updated.githubRepoUrl ?? "");
      setWebsiteUrl(updated.websiteUrl ?? "");
      setPricingPageUrl(updated.pricingPageUrl ?? "");
      setOrgUnitId(updated.orgUnitId ?? "");
      setWorkItemKind(updated.workItemKind ?? "product");
      toast.success(t("products.settings.saved"));
    } catch (err) {
      toast.error(translateApiError(err, t, "common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const refreshWebContext = async () => {
    if (!productId) return;
    setWebRefreshBusy(true);
    try {
      const { product: updated } = await api.products.refreshWebContext(productId);
      setProduct(updated);
      if (updated.webSnapshotHasError) {
        toast.error(t("products.settings.webContextRefreshPartial"));
      } else {
        toast.success(t("products.settings.webContextRefreshed"));
      }
    } catch (err) {
      toast.error(translateApiError(err, t, "products.settings.webContextRefreshFailed"));
    } finally {
      setWebRefreshBusy(false);
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
      <div className="mx-auto max-w-4xl space-y-4">
        <p className="text-sm text-[var(--color-muted-foreground)]">{t("products.settings.notFound")}</p>
        <Link to="/products?tab=active" className="text-[var(--color-primary)] hover:underline">
          {t("products.title")}
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: "general", label: t("products.settings.tabs.general") },
    { id: "intake", label: t("products.settings.tabs.intake") },
    { id: "revenue", label: t("products.settings.tabs.revenue") },
    { id: "opencode", label: t("products.settings.tabs.opencode") },
    { id: "integrations", label: t("products.settings.tabs.integrations") },
  ];

  return (
    <div className={`mx-auto space-y-6 ${activeTab === "intake" ? "max-w-6xl" : "max-w-4xl"}`}>
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
              to={`/products/${product.id}/desk`}
              className="text-xs text-[var(--color-primary)] hover:underline"
            >
              {t("productDesk.title")} →
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

      <TabsBar sticky tabs={tabs} activeId={activeTab} onChange={(id) => setTab(id as ProductSettingsTab)} />

      {activeTab === "general" && (
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
              <Input
                label={t("products.settings.websiteUrlLabel")}
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://ejemplo.com"
                disabled={saving}
              />
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                {t("products.settings.websiteUrlHint")}
              </p>
            </div>
            <div>
              <Input
                label={t("products.settings.pricingPageUrlLabel")}
                value={pricingPageUrl}
                onChange={(e) => setPricingPageUrl(e.target.value)}
                placeholder="https://ejemplo.com/pricing"
                disabled={saving}
              />
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                {t("products.settings.pricingPageUrlHint")}
              </p>
            </div>
            {(websiteUrl.trim() || pricingPageUrl.trim()) && (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-3">
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {product.webSnapshotFetchedAt
                    ? t("products.settings.webContextLastFetch", {
                        date: new Date(product.webSnapshotFetchedAt).toLocaleString(),
                      })
                    : t("products.settings.webContextNotFetched")}
                  {product.webSnapshotHasError ? ` ${t("products.settings.webContextFetchError")}` : ""}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  disabled={webRefreshBusy || saving}
                  onClick={() => void refreshWebContext()}
                >
                  {webRefreshBusy
                    ? t("products.settings.webContextRefreshing")
                    : t("products.settings.webContextRefresh")}
                </Button>
              </div>
            )}
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
      )}

      {activeTab === "intake" && (
        <ProductIntakePreviewPanel
          product={product}
          intakeBusy={intakeBusy}
          onRerunIntake={rerunIntake}
        />
      )}

      {activeTab === "revenue" && (
        <ProductRevenueSettingsPanel productId={productId} onSaved={() => void load()} />
      )}

      {activeTab === "opencode" && <ProductOpencodeSettingsPanel productId={productId} />}

      {activeTab === "integrations" && productId && (
        <ProductIntegrationsPanel productId={productId} />
      )}

      <p className="text-xs text-[var(--color-muted-foreground)]">
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
