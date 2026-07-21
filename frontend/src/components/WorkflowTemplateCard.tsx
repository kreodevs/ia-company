import { Link } from "react-router-dom";
import {
  formatWorkflowTitle,
  stepDisplayName,
  workflowPipelineSteps,
} from "../lib/workflow-display";
import type { Workflow } from "../lib/api";

interface WorkflowTemplateCardProps {
  workflow: Workflow;
  editorPath: string;
  deleting?: boolean;
  onDelete: () => void;
}

export default function WorkflowTemplateCard({
  workflow,
  editorPath,
  deleting = false,
  onDelete,
}: WorkflowTemplateCardProps) {
  const pipeline = workflowPipelineSteps(workflow);
  const hiddenSteps = workflow.steps.length - pipeline.length;
  const title = formatWorkflowTitle(workflow.name);

  return (
    <article className="flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 transition hover:border-[var(--color-primary)]/40 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{title}</h3>
          <p className="mt-0.5 truncate text-xs text-[var(--color-muted-foreground)]">
            {workflow.name}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-muted)]/40 px-2.5 py-0.5 text-xs text-[var(--color-muted-foreground)]">
          {workflow.steps.length} steps
        </span>
      </div>

      {workflow.description ? (
        <p className="mt-3 line-clamp-2 text-sm text-[var(--color-muted-foreground)]">
          {workflow.description}
        </p>
      ) : null}

      {pipeline.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Agent pipeline">
          {pipeline.map((step, index) => (
            <span key={step.id} className="flex items-center gap-1.5">
              {index > 0 ? (
                <span className="text-[var(--color-muted-foreground)]" aria-hidden>
                  →
                </span>
              ) : null}
              <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-0.5 text-xs">
                {stepDisplayName(step)}
              </span>
            </span>
          ))}
          {hiddenSteps > 0 ? (
            <span className="text-xs text-[var(--color-muted-foreground)]">+{hiddenSteps} more</span>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
          No steps yet — open the editor to build this workflow.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-4">
        <Link
          to={editorPath}
          className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-[var(--color-primary-foreground)] transition hover:opacity-90"
        >
          Open editor
        </Link>
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {workflow.edges.length} connection{workflow.edges.length === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          disabled={deleting}
          onClick={onDelete}
          className="ml-auto text-xs text-[var(--color-destructive)] hover:underline disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </article>
  );
}
