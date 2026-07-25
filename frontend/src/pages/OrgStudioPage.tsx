import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import type { BusinessTemplateSummary, OrgStudioProposal } from "../lib/org-types";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import SchemaDynamicForm from "../components/org/SchemaDynamicForm";
import PageLoading from "../components/ui/PageLoading";

export default function OrgStudioPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<BusinessTemplateSummary[]>([]);
  const [templateSlug, setTemplateSlug] = useState("marketing-agency");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [proposal, setProposal] = useState<OrgStudioProposal | null>(null);
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [proposing, setProposing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.orgStudio
      .templates()
      .then((rows) => {
        setTemplates(rows);
        if (rows[0]) setTemplateSlug(rows[0].slug);
      })
      .finally(() => setLoading(false));
  }, []);

  const runPropose = async () => {
    setProposing(true);
    setError(null);
    try {
      const p = await api.orgStudio.propose({ templateSlug, name: name || undefined, description });
      setProposal(p);
      setConfig(p.configDefaults);
      if (!name) setName(p.suggestedName);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProposing(false);
    }
  };

  const runApply = async () => {
    if (!proposal) return;
    setApplying(true);
    setError(null);
    try {
      const result = await api.orgStudio.apply({
        proposal: { ...proposal, configDefaults: config },
        name: name || proposal.suggestedName,
        config,
      });
      navigate(`/org-units/${result.orgUnit.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <PageLoading message={t("org.studio.loading")} />;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <PageHeader title={t("org.studio.title")} subtitle={t("org.studio.subtitle")} />

      <Panel title={t("org.studio.step1")} bodySize="sm">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
              {t("org.studio.template")}
            </label>
            <Select
              value={templateSlug}
              onChange={setTemplateSlug}
              options={templates.map((tpl) => ({ value: tpl.slug, label: tpl.name }))}
              ariaLabel={t("org.studio.template")}
            />
          </div>
          <Input
            label={t("org.studio.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("org.studio.namePlaceholder")}
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
              {t("org.studio.mission")}
            </label>
            <textarea
              className="min-h-[96px] w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("org.studio.missionPlaceholder")}
            />
          </div>
          <Button onClick={() => void runPropose()} disabled={proposing}>
            {proposing ? t("org.studio.proposing") : t("org.studio.generate")}
          </Button>
        </div>
      </Panel>

      {error && (
        <p className="rounded-md border border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/10 px-3 py-2 text-sm text-[var(--color-destructive)]">
          {error}
        </p>
      )}

      {proposal && (
        <>
          <Panel title={t("org.studio.step2")} subtitle={proposal.summary} bodySize="sm">
            <div className="mb-4 space-y-2 text-sm">
              <p>
                <strong>{t("org.studio.agents")}:</strong>{" "}
                {proposal.suggestedAgents.map((a) => a.name).join(", ") || "—"}
              </p>
              <p>
                <strong>{t("org.studio.artifacts")}:</strong> {proposal.artifactTypes.join(", ")}
              </p>
            </div>
            <SchemaDynamicForm
              schema={proposal.configSchema}
              initialValues={config}
              submitText={t("org.studio.saveConfig")}
              onSubmit={async (values) => setConfig(values)}
            />
          </Panel>

          <Panel title={t("org.studio.designMd")} bodySize="sm">
            <pre className="max-h-48 overflow-auto rounded-md bg-[var(--color-background)] p-3 text-xs whitespace-pre-wrap">
              {proposal.designMd}
            </pre>
          </Panel>

          <Button onClick={() => void runApply()} disabled={applying}>
            {applying ? t("org.studio.applying") : t("org.studio.apply")}
          </Button>
        </>
      )}
    </div>
  );
}
