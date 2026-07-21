import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Workflow } from "../lib/api";
import WorkflowTemplateCard from "../components/WorkflowTemplateCard";
import { formatWorkflowTitle } from "../lib/workflow-display";

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingWorkflowId, setDeletingWorkflowId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");

  const load = () => api.workflows.list().then(setWorkflows);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const filteredWorkflows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return workflows;
    return workflows.filter((workflow) => {
      const haystack = [
        workflow.name,
        formatWorkflowTitle(workflow.name),
        workflow.description ?? "",
        ...workflow.steps.map((step) => step.agent?.name ?? ""),
        ...workflow.steps.map((step) => step.agent?.role ?? ""),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [search, workflows]);

  const createWorkflow = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const workflow = await api.workflows.create({ name: name.trim() });
      setName("");
      await navigate(`/workflows/${workflow.id}`);
    } finally {
      setCreating(false);
    }
  };

  const deleteWorkflow = async (workflow: Workflow) => {
    if (!confirm(`Delete workflow "${workflow.name}"?`)) return;
    setDeletingWorkflowId(workflow.id);
    try {
      await api.workflows.delete(workflow.id);
      await load();
    } finally {
      setDeletingWorkflowId(null);
    }
  };

  if (loading) return <p className="text-[var(--color-muted-foreground)]">Loading workflows…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Workflows</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Agent pipelines for your organization. Open a workflow to edit steps and run it.
          </p>
        </div>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {filteredWorkflows.length} of {workflows.length}
        </p>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div className="flex flex-col gap-2 lg:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workflows or agents…"
            className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
          />
          <div className="flex min-w-0 flex-1 gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New workflow name"
              className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") void createWorkflow();
              }}
            />
            <button
              type="button"
              disabled={creating || !name.trim()}
              onClick={() => void createWorkflow()}
              className="shrink-0 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create & edit"}
            </button>
          </div>
        </div>
      </div>

      {filteredWorkflows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)]/40 px-6 py-12 text-center">
          <p className="font-medium">
            {workflows.length === 0 ? "No workflows yet" : "No workflows match your search"}
          </p>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            {workflows.length === 0
              ? "Create your first workflow to chain agents into a repeatable process."
              : "Try another search term or clear the filter."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredWorkflows.map((workflow) => (
            <li key={workflow.id}>
              <WorkflowTemplateCard
                workflow={workflow}
                editorPath={`/workflows/${workflow.id}`}
                deleting={deletingWorkflowId === workflow.id}
                onDelete={() => void deleteWorkflow(workflow)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
