import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import WorkflowCanvas from "../components/WorkflowCanvas";
import { api, type Agent, type Workflow } from "../lib/api";

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
    return <p className="text-[var(--color-muted-foreground)]">{t("workflows.platformEditor.loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Link
            to="/admin/templates/workflows"
            className="text-sm text-[var(--color-muted-foreground)] hover:underline"
          >
            ← {t("nav.backToWorkflows")}
          </Link>
          <input
            className="mt-1 w-full max-w-xl rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-2xl font-bold"
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
          <textarea
            className="w-full max-w-xl rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm"
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
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {t("workflows.platformEditor.globalTemplateHint")}
          </p>
        </div>
        <button
          onClick={() => void handleDelete()}
          disabled={deleting}
          className="rounded-lg border border-red-500/50 px-4 py-2 text-sm text-red-400 disabled:opacity-50"
        >
          {deleting ? t("common.deleting") : t("workflows.platformEditor.deleteTemplate")}
        </button>
      </div>

      <WorkflowCanvas workflow={workflow} agents={agents} onSave={handleSave} saving={saving} />
    </div>
  );
}
