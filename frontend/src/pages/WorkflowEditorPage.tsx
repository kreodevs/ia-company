import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import WorkflowCanvas from "../components/WorkflowCanvas";
import { api, type Agent, type TenantConsensus, type Workflow } from "../lib/api";

export default function WorkflowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [consensus, setConsensus] = useState<TenantConsensus | null>(null);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [useConsensus, setUseConsensus] = useState(true);
  const [taskOverride, setTaskOverride] = useState("");

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
    setTaskOverride(consensusDoc.nextAction ?? "");
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

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
      navigate(`/runs/${runId}`);
    } finally {
      setExecuting(false);
    }
  };

  if (!workflow) {
    return <p className="text-[var(--color-muted-foreground)]">Loading workflow…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/workflows" className="text-sm text-[var(--color-muted-foreground)] hover:underline">
            ← Workflows
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{workflow.name}</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">{workflow.description}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:max-w-md">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useConsensus}
              onChange={(e) => setUseConsensus(e.target.checked)}
            />
            Load & sync tenant consensus
          </label>
          <label className="block text-sm">
            {useConsensus ? "Next action override (optional)" : "Task / memory seed"}
            <input
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm"
              value={taskOverride}
              onChange={(e) => setTaskOverride(e.target.value)}
              placeholder={consensus?.nextAction ?? "Evaluate next opportunity"}
            />
          </label>
          {useConsensus && consensus?.content && (
            <p className="line-clamp-2 text-xs text-[var(--color-muted-foreground)]">
              Consensus: {consensus.content.slice(0, 120)}…
            </p>
          )}
          <button
            onClick={() => void handleExecute()}
            disabled={executing}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {executing ? "Starting…" : "Execute workflow"}
          </button>
        </div>
      </div>

      <WorkflowCanvas workflow={workflow} agents={agents} onSave={handleSave} saving={saving} />
    </div>
  );
}
