import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import type { Artifact, OrgUnit } from "../lib/org-types";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import PageLoading from "../components/ui/PageLoading";
import SchemaDynamicForm from "../components/org/SchemaDynamicForm";
import ArtifactGallery from "../components/org/ArtifactGallery";
import Button from "../components/ui/Button";

export default function OrgUnitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [unit, setUnit] = useState<OrgUnit | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!id) return;
    const [u, arts] = await Promise.all([
      api.orgUnits.get(id),
      api.orgUnits.artifacts(id),
    ]);
    setUnit(u);
    setArtifacts(arts);
  };

  useEffect(() => {
    if (!id) return;
    load().finally(() => setLoading(false));
  }, [id]);

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
        <ArtifactGallery artifacts={artifacts} />
      </Panel>
    </div>
  );
}
