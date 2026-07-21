import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, type Workflow } from "../lib/api";

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const load = () => api.workflows.list().then(setWorkflows);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

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

  if (loading) return <p className="text-[var(--color-muted-foreground)]">Loading workflows…</p>;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Workflows</h1>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New workflow name"
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm"
          />
          <button
            disabled={creating || !name.trim()}
            onClick={() => void createWorkflow()}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create workflow"}
          </button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workflows.map((wf) => (
          <Link
            key={wf.id}
            to={`/workflows/${wf.id}`}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 transition hover:border-[var(--color-primary)]"
          >
            <h2 className="font-semibold">{wf.name}</h2>
            <p className="mt-2 line-clamp-2 text-sm text-[var(--color-muted-foreground)]">
              {wf.description ?? "No description"}
            </p>
            <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
              {wf.steps.length} steps · {wf.edges.length} connections
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
