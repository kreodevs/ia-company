import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, type Workflow } from "../lib/api";

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.workflows.list().then(setWorkflows).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-[var(--color-muted-foreground)]">Loading workflows…</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Workflows</h1>
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
