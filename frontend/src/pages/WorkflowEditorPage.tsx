import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import WorkflowFlowEditor from "../components/workflows/WorkflowFlowEditor";
import WorkflowAiEnrichModal from "../components/workflows/WorkflowAiEnrichModal";
import { api, type Agent, type TenantConsensus, type Workflow } from "../lib/api";
import {
  consumeStoredWorkflowTask,
  resolveWorkflowTaskOverride,
} from "../lib/workflow-task-override";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Panel from "../components/ui/Panel";

export default function WorkflowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [consensus, setConsensus] = useState<TenantConsensus | null>(null);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [enrichOpen, setEnrichOpen] = useState(false);
  const [useConsensus, setUseConsensus] = useState(true);
  const [taskOverride, setTaskOverride] = useState("");
  const pendingNavTaskRef = useRef<string | undefined>(
    (location.state as { taskOverride?: string } | null)?.taskOverride?.trim() || undefined,
  );

  const load = useCallback(async () => {
    if (!id) return;
    const [wf, ag, consensusDoc] = await Promise.all([
      api.workflows.get(id),
      api.agents.list(),
      api.consensus.get(),
    ]);
    setWorkflow(wf);
    setAgents(ag);
    setConsensus(consensusDoc);
    setTaskOverride(
      resolveWorkflowTaskOverride({
        storedTask: consumeStoredWorkflowTask(id),
        locationTask: pendingNavTaskRef.current,
        consensusNextAction: consensusDoc.nextAction,
        workflowDescription: wf.description,
      }),
    );
    pendingNavTaskRef.current = undefined;
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!pendingNavTaskRef.current) return;
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, navigate]);

  const handleSave = async (steps: Workflow["steps"], edges: Workflow["edges"]) => {
    if (!workflow) return;
    setSaving(true);
    try {
      const updated = await api.workflows.update(workflow.id, {
        name: workflow.name,
        description: workflow.description ?? undefined,
        steps: steps.map((s) => ({
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

  const handleExecute = async () => {
    if (!workflow) return;
    setExecuting(true);
    try {
      const body = useConsensus
        ? {
            mergeConsensus: true,
            syncConsensus: true,
            initialMemory: taskOverride.trim()
              ? { nextAction: taskOverride.trim(), task: taskOverride.trim() }
              : undefined,
          }
        : {
            mergeConsensus: false,
            syncConsensus: false,
            initialMemory: { task: taskOverride, nextAction: taskOverride },
          };

      const { runId } = await api.workflows.execute(workflow.id, body);
      navigate(`/debug/runs/${runId}`);
    } finally {
      setExecuting(false);
    }
  };

  if (!workflow) {
    return <PageLoading message={t("workflows.list.loadingOne")} />;
  }

  return (
    <div className="flex min-h-0 flex-col gap-4 sm:gap-6">
      <PageHeader
        eyebrow={
          <Breadcrumbs
            items={[
              { label: t("nav.procedures"), to: "/settings/procedures" },
              { label: workflow.name },
            ]}
          />
        }
        title={workflow.name}
        subtitle={workflow.description ?? undefined}
        actions={
          <Button variant="secondary" onClick={() => setEnrichOpen(true)}>
            {t("workflows.ai.enrichOpen")}
          </Button>
        }
      />

      <Panel title={t("workflows.editor.executePanelTitle", { defaultValue: "Run workflow" })} bodySize="sm">
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={useConsensus}
            onChange={(e) => setUseConsensus(e.target.checked)}
            className="size-4 shrink-0"
          />
          {t("workflows.editor.loadSyncConsensus")}
        </label>
        <Input
          label={
            useConsensus ? t("workflows.editor.nextActionOverride") : t("workflows.editor.taskMemorySeed")
          }
          value={taskOverride}
          onChange={(e) => setTaskOverride(e.target.value)}
          placeholder={consensus?.nextAction ?? t("workflows.editor.nextActionPlaceholder")}
        />
        {useConsensus && consensus?.content && (
          <p className="line-clamp-2 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
            {t("workflows.editor.consensusPreview", { preview: consensus.content.slice(0, 120) })}
          </p>
        )}
        <Button
          onClick={() => void handleExecute()}
          disabled={executing}
          fullWidthMobile
          className="w-full sm:w-auto"
        >
          {executing ? t("common.starting") : t("workflows.editor.execute")}
        </Button>
      </Panel>

      <div className="min-h-[420px] flex-1 sm:min-h-[520px]">
        <WorkflowFlowEditor
          workflow={workflow}
          agents={agents}
          onSave={handleSave}
          saving={saving}
          showExecute
        />
      </div>

      <WorkflowAiEnrichModal
        open={enrichOpen}
        workflowId={workflow.id}
        workflowName={workflow.name}
        onClose={() => setEnrichOpen(false)}
        onEnriched={(updated) => {
          setWorkflow(updated);
          void load();
        }}
      />
    </div>
  );
}
