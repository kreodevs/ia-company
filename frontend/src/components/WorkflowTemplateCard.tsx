import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  formatWorkflowTitle,
  stepDisplayName,
  workflowPipelineSteps,
} from "../lib/workflow-display";
import type { Workflow } from "../lib/api";
import Button from "./ui/Button";

interface WorkflowTemplateCardProps {
  workflow: Workflow;
  editorPath: string;
  deleting?: boolean;
  onDelete: () => void;
  hideSlug?: boolean;
}

export default function WorkflowTemplateCard({
  workflow,
  editorPath,
  deleting = false,
  onDelete,
  hideSlug = false,
}: WorkflowTemplateCardProps) {
  const { t } = useTranslation();
  const pipeline = workflowPipelineSteps(workflow);
  const hiddenSteps = workflow.steps.length - pipeline.length;
  const title = formatWorkflowTitle(workflow.name);

  return (
    <article className="interactive flex h-full flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 transition hover:border-[var(--color-primary)]/40 hover:shadow-md hover:shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{title}</h3>
          {!hideSlug && workflow.name !== title ? (
            <p className="mt-0.5 truncate text-xs text-[var(--color-muted-foreground)]">
              {workflow.name}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-muted)]/40 px-2.5 py-0.5 text-xs text-[var(--color-muted-foreground)]">
          {t("workflowCard.stepsCount", {
            count: workflow.steps.length,
            defaultValue: `${workflow.steps.length} steps`,
          })}
        </span>
      </div>

      {workflow.description ? (
        <p className="mt-3 line-clamp-2 text-sm text-[var(--color-muted-foreground)]">
          {workflow.description}
        </p>
      ) : null}

      {pipeline.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label={t("nav.agents")}>
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
            <span className="text-xs text-[var(--color-muted-foreground)]">
              {t("workflowCard.moreSteps", {
                count: hiddenSteps,
                defaultValue: `+${hiddenSteps} more`,
              })}
            </span>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
          {t("workflows.card.noSteps")}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:flex-wrap sm:items-center">
        <Link
          to={editorPath}
          className="interactive inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90 sm:min-h-9 sm:w-auto"
        >
          {t("workflows.card.openEditor")}
        </Link>
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {t("workflowCard.connectionsCount", {
            count: workflow.edges.length,
            defaultValue: `${workflow.edges.length} connection${workflow.edges.length === 1 ? "" : "s"}`,
          })}
        </span>
        <Button
          variant="destructive"
          disabled={deleting}
          onClick={onDelete}
          className="w-full sm:ml-auto sm:w-auto"
        >
          {deleting ? t("common.deleting") : t("common.delete")}
        </Button>
      </div>
    </article>
  );
}
