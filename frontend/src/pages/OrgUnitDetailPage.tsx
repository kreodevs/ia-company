import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type TenantProduct } from "../lib/api";
import type { Artifact, OrgUnit } from "../lib/org-types";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import PageLoading from "../components/ui/PageLoading";
import SchemaDynamicForm from "../components/org/SchemaDynamicForm";
import ArtifactGallery from "../components/org/ArtifactGallery";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import { toast } from "../components/molecules/Sonner";
import { translateApiError } from "../lib/translate-error";

export default function OrgUnitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [unit, setUnit] = useState<OrgUnit | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [linkedProducts, setLinkedProducts] = useState<TenantProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [launchTask, setLaunchTask] = useState("");
  const [launchProductId, setLaunchProductId] = useState("");
  const [launching, setLaunching] = useState(false);

  const load = async () => {
    if (!id) return;
    const [u, arts, products] = await Promise.all([
      api.orgUnits.get(id),
      api.orgUnits.artifacts(id),
      api.orgUnits.products(id),
    ]);
    setUnit(u);
    setArtifacts(arts);
    setLinkedProducts(products);
    if (products.length && !launchProductId) {
      setLaunchProductId(products[0]!.id);
    }
  };

  useEffect(() => {
    if (!id) return;
    load().finally(() => setLoading(false));
  }, [id]);

  const launchWork = async () => {
    if (!id || !launchTask.trim()) return;
    setLaunching(true);
    try {
      const result = await api.orgUnits.launch(id, {
        task: launchTask.trim(),
        productId: launchProductId || undefined,
      });
      toast.success(t("org.launchStarted"));
      navigate(`/office/encargos/${result.runId}`);
    } catch (err) {
      toast.error(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setLaunching(false);
    }
  };

  if (loading) return <PageLoading message={t("org.loading")} />;
  if (!unit) {
    return (
      <div className="p-6">
        <p>{t("org.notFound")}</p>
        <Link to="/org-units" className="text-[var(--color-primary)] hover:underline">
          ← {t("org.title")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <PageHeader
        title={unit.name}
        subtitle={`${unit.type} · ${unit.workspacePath}`}
        actions={
          <Link to="/org-units">
            <Button variant="secondary">{t("org.back")}</Button>
          </Link>
        }
      />

      <Panel title={t("org.launchTitle")} subtitle={t("org.launchSubtitle")} bodySize="sm">
        <div className="space-y-3">
          <Input
            label={t("org.launchTaskLabel")}
            value={launchTask}
            onChange={(e) => setLaunchTask(e.target.value)}
            placeholder={t("org.launchTaskPlaceholder")}
            disabled={launching}
          />
          {linkedProducts.length > 0 ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
                {t("org.launchProductLabel")}
              </label>
              <Select
                value={launchProductId}
                onChange={setLaunchProductId}
                options={linkedProducts.map((p) => ({ value: p.id, label: p.name }))}
                ariaLabel={t("org.launchProductLabel")}
              />
            </div>
          ) : (
            <p className="text-xs text-amber-600 dark:text-amber-300">{t("org.launchNeedsProduct")}</p>
          )}
          <Button
            onClick={() => void launchWork()}
            disabled={launching || !launchTask.trim() || linkedProducts.length === 0}
          >
            {launching ? t("org.launching") : t("org.launchCta")}
          </Button>
        </div>
      </Panel>

      {linkedProducts.length > 0 && (
        <Panel title={t("org.linkedProductsTitle")} bodySize="sm">
          <ul className="space-y-1 text-sm">
            {linkedProducts.map((p) => (
              <li key={p.id}>
                <Link to={`/products/${p.id}/settings`} className="text-[var(--color-primary)] hover:underline">
                  {p.name}
                </Link>
                <span className="ml-2 text-xs text-[var(--color-muted-foreground)]">({p.workItemKind ?? "product"})</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title={t("org.configTitle")} bodySize="sm">
        {unit.configSchema?.sections?.length || unit.configSchema?.fields?.length ? (
          <SchemaDynamicForm
            schema={unit.configSchema}
            initialValues={unit.config as Record<string, unknown>}
            submitting={saving}
            submitText={t("org.saveConfig")}
            onSubmit={async (values) => {
              setSaving(true);
              try {
                const updated = await api.orgUnits.update(unit.id, { config: values });
                setUnit(updated);
              } finally {
                setSaving(false);
              }
            }}
          />
        ) : (
          <p className="text-sm text-[var(--color-muted-foreground)]">{t("org.noConfigSchema")}</p>
        )}
      </Panel>

      <Panel title={t("org.designTitle")} bodySize="sm">
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-[var(--color-background)] p-3 text-xs">
          {unit.designMd ?? t("org.noDesignMd")}
        </pre>
      </Panel>

      <Panel title={t("org.artifactsTitle")} bodySize="sm">
        <ArtifactGallery
          artifacts={artifacts}
          onStatusChange={async (artifactId, status) => {
            await api.orgUnits.updateArtifactStatus(artifactId, status);
            await load();
          }}
        />
      </Panel>
    </div>
  );
}
