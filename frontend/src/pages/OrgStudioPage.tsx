import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type WorkItemKind } from "../lib/api";
import type { BusinessTemplateSummary, OrgStudioProposal } from "../lib/org-types";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import SchemaDynamicForm from "../components/org/SchemaDynamicForm";
import PageLoading from "../components/ui/PageLoading";
import { translateApiError } from "../lib/translate-error";

function defaultWorkItemKindForTemplate(orgUnitType: string): WorkItemKind {
  if (orgUnitType === "marketing_agency") return "client";
  if (orgUnitType === "custom" || orgUnitType === "department") return "project";
  return "product";
}

const WORK_ITEM_OPTIONS: WorkItemKind[] = ["product", "client", "campaign", "project"];

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
  const [createWorkItem, setCreateWorkItem] = useState(true);
  const [workItemKind, setWorkItemKind] = useState<WorkItemKind>("client");
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = templates.find((tpl) => tpl.slug === templateSlug);

  useEffect(() => {
    if (selectedTemplate) {
      setWorkItemKind(defaultWorkItemKindForTemplate(selectedTemplate.orgUnitType));
    }
  }, [selectedTemplate?.orgUnitType, selectedTemplate?.slug]);

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
      setWorkItemKind(defaultWorkItemKindForTemplate(p.orgUnitType));
      if (!name) setName(p.suggestedName);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProposing(false);
    }
  };

  const runApply = async () => {
    if (!proposal) return;
    if (proposal.mungerReview && !proposal.mungerReview.approved) return;
    setApplying(true);
    setError(null);
    try {
      const result = await api.orgStudio.apply({
        proposal: { ...proposal, configDefaults: config },
        name: name || proposal.suggestedName,
        config,
        createWorkItem,
        workItemKind,
      });
      navigate(`/org-units/${result.orgUnit.id}`);
    } catch (err) {
      setError(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setApplying(false);
    }
  };

  const mungerBlocked = Boolean(proposal?.mungerReview && !proposal.mungerReview.approved);

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

          {proposal.mungerReview && (
            <Panel
              title={t("org.studio.mungerTitle")}
              bodySize="sm"
              subtitle={
                proposal.mungerReview.approved
                  ? t("org.studio.mungerApproved")
                  : t("org.studio.mungerVeto")
              }
            >
              <p className="text-sm whitespace-pre-wrap">{proposal.mungerReview.notes}</p>
              {proposal.mungerReview.veto && (
                <p className="mt-2 text-sm text-[var(--color-destructive)]">
                  {proposal.mungerReview.veto.reason}
                </p>
              )}
            </Panel>
          )}

          <Panel title={t("org.studio.designMd")} bodySize="sm">
            <pre className="max-h-48 overflow-auto rounded-md bg-[var(--color-background)] p-3 text-xs whitespace-pre-wrap">
              {proposal.designMd}
            </pre>
          </Panel>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={createWorkItem}
              onChange={(e) => setCreateWorkItem(e.target.checked)}
            />
            {t("org.studio.createWorkItem")}
          </label>

          {createWorkItem && (
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
                {t("org.studio.workItemKindLabel")}
              </label>
              <Select
                value={workItemKind}
                onChange={(v) => setWorkItemKind(v as WorkItemKind)}
                options={WORK_ITEM_OPTIONS.map((kind) => ({
                  value: kind,
                  label: t(`products.settings.workItemKind.${kind}`),
                }))}
                ariaLabel={t("org.studio.workItemKindLabel")}
              />
            </div>
          )}

          <p className="text-xs text-[var(--color-muted-foreground)]">{t("org.studio.mungerHint")}</p>

          <Button onClick={() => void runApply()} disabled={applying || mungerBlocked}>
            {applying ? t("org.studio.applying") : t("org.studio.apply")}
          </Button>
        </>
      )}
    </div>
  );
}
