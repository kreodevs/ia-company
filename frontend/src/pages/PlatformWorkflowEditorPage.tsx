import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import WorkflowFlowEditor from "../components/workflows/WorkflowFlowEditor";
import { api, type Agent, type Workflow } from "../lib/api";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Panel from "../components/ui/Panel";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function PlatformWorkflowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [wf, ag] = await Promise.all([
      api.admin.templates.getWorkflow(id),
      api.admin.templates.listAgents(),
    ]);
    setWorkflow(wf);
    setAgents(ag);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async (steps: Workflow["steps"], edges: Workflow["edges"]) => {
    if (!workflow) return;
    setSaving(true);
    try {
      const updated = await api.admin.templates.updateWorkflow(workflow.id, {
        name: workflow.name,
        description: workflow.description ?? undefined,
        steps: steps.map((s) => ({
          id: s.id,
          agentId: s.agentId,
          stepOrder: s.stepOrder,
          label: s.label ?? undefined,
          positionX: s.positionX,
          positionY: s.positionY,
          inputConfig: s.inputConfig,
          outputConfig: s.outputConfig,
        })),
        edges: edges.map((e) => ({
          sourceStepId: e.sourceStepId,
          targetStepId: e.targetStepId,
        })),
      });
      setWorkflow(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!workflow || !confirm(t("admin.templates.workflows.deleteConfirm", { name: workflow.name }))) {
      return;
    }
    setDeleting(true);
    try {
      await api.admin.templates.deleteWorkflow(workflow.id);
      navigate("/admin/templates/workflows");
    } finally {
      setDeleting(false);
    }
  };

  if (!workflow) {
    return <PageLoading message={t("workflows.platformEditor.loading")} />;
  }

  return (
    <div className="flex min-h-0 flex-col gap-4 sm:gap-6">
      <PageHeader
        eyebrow={
          <Breadcrumbs
            items={[
              { label: t("nav.admin"), to: "/admin" },
              { label: t("admin.templates.workflows.title"), to: "/admin/templates/workflows" },
              { label: workflow.name },
            ]}
          />
        }
        title={workflow.name}
        subtitle={t("workflows.platformEditor.globalTemplateHint")}
        actions={
          <Button variant="destructive" disabled={deleting} onClick={() => void handleDelete()} fullWidthMobile>
            {deleting ? t("common.deleting") : t("workflows.platformEditor.deleteTemplate")}
          </Button>
        }
      />

      <Panel title={t("workflows.editor.metadataTitle", { defaultValue: "Workflow details" })} bodySize="sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label={t("common.name")}
            value={workflow.name}
            onChange={(e) => setWorkflow({ ...workflow, name: e.target.value })}
            onBlur={() => {
              void api.admin.templates
                .updateWorkflow(workflow.id, {
                  name: workflow.name,
                  description: workflow.description ?? undefined,
                })
                .then(setWorkflow);
            }}
          />
          <label className="block space-y-1.5 text-sm sm:col-span-2">
            <span className="font-medium">{t("common.description")}</span>
            <textarea
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              rows={2}
              placeholder={t("workflows.platformEditor.descriptionPlaceholder")}
              value={workflow.description ?? ""}
              onChange={(e) => setWorkflow({ ...workflow, description: e.target.value })}
              onBlur={() => {
                void api.admin.templates
                  .updateWorkflow(workflow.id, {
                    name: workflow.name,
                    description: workflow.description ?? undefined,
                  })
                  .then(setWorkflow);
              }}
            />
          </label>
        </div>
      </Panel>

      <div className="min-h-[420px] flex-1 sm:min-h-[520px]">
        <WorkflowFlowEditor workflow={workflow} agents={agents} onSave={handleSave} saving={saving} />
      </div>
    </div>
  );
}
