import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import WorkflowTemplateCard from "../components/WorkflowTemplateCard";
import { api, type Workflow } from "../lib/api";
import { formatWorkflowTitle } from "../lib/workflow-display";
import { translateApiError } from "../lib/translate-error";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";

export default function PlatformWorkflowTemplatesPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [creatingWorkflow, setCreatingWorkflow] = useState(false);
  const [deletingWorkflowId, setDeletingWorkflowId] = useState<string | null>(null);
  const [workflowSearch, setWorkflowSearch] = useState("");

  const load = async () => {
    setWorkflows(await api.admin.templates.listWorkflows());
  };

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, []);

  const filteredWorkflows = useMemo(() => {
    const query = workflowSearch.trim().toLowerCase();
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
  }, [workflowSearch, workflows]);

  const createWorkflowTemplate = async () => {
    const name = newWorkflowName.trim();
    if (!name) return;
    setCreatingWorkflow(true);
    setMessage(null);
    try {
      const workflow = await api.admin.templates.createWorkflow({ name });
      setNewWorkflowName("");
      await load();
      navigate(`/admin/templates/workflows/${workflow.id}`);
    } catch (err) {
      setMessage(translateApiError(err, t, "common.createFailed"));
    } finally {
      setCreatingWorkflow(false);
    }
  };

  const deleteWorkflowTemplate = async (workflow: Workflow) => {
    if (!confirm(t("admin.templates.workflows.deleteConfirm", { name: workflow.name }))) return;
    setDeletingWorkflowId(workflow.id);
    setMessage(null);
    try {
      await api.admin.templates.deleteWorkflow(workflow.id);
      await load();
      setMessage(t("admin.templates.workflows.deleted", { name: workflow.name }));
    } catch (err) {
      setMessage(translateApiError(err, t, "common.deleteFailed"));
    } finally {
      setDeletingWorkflowId(null);
    }
  };

  if (loading) {
    return <PageLoading message={t("workflows.list.loading")} />;
  }

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col gap-4 overflow-hidden sm:h-[calc(100dvh-8rem)] sm:gap-6">
      <PageHeader
        eyebrow={
          <Link to="/admin" className="interactive text-[var(--color-primary)] hover:underline">
            ← {t("nav.admin")}
          </Link>
        }
        title={t("admin.templates.workflows.title")}
        subtitle={t("admin.templates.workflows.subtitle")}
        meta={
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {filteredWorkflows.length} {t("common.of")} {workflows.length}
          </p>
        }
      />

      {message && (
        <p className="shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-2 text-sm">
          {message}
        </p>
      )}

      <div className="shrink-0 space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div className="flex flex-col gap-2 lg:flex-row">
          <input
            value={workflowSearch}
            onChange={(e) => setWorkflowSearch(e.target.value)}
            placeholder={t("workflows.list.searchPlaceholder")}
            className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
          />
          <div className="flex min-w-0 flex-1 gap-2">
            <input
              value={newWorkflowName}
              onChange={(e) => setNewWorkflowName(e.target.value)}
              placeholder={t("admin.templates.workflows.newNamePlaceholder")}
              className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") void createWorkflowTemplate();
              }}
            />
            <button
              type="button"
              disabled={creatingWorkflow || !newWorkflowName.trim()}
              onClick={() => void createWorkflowTemplate()}
              className="shrink-0 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
            >
              {creatingWorkflow ? t("common.creating") : t("workflows.list.createAndEdit")}
            </button>
          </div>
        </div>
      </div>

      {filteredWorkflows.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)]/40 px-6 py-12 text-center">
          <p className="font-medium">
            {workflows.length === 0
              ? t("admin.templates.workflows.emptyTitle")
              : t("workflows.list.emptySearchTitle")}
          </p>
          <p className="mt-2 max-w-md text-sm text-[var(--color-muted-foreground)]">
            {workflows.length === 0
              ? t("admin.templates.workflows.emptyTitleHint")
              : t("workflows.list.emptySearchSubtitle")}
          </p>
        </div>
      ) : (
        <ul className="grid min-h-0 flex-1 gap-4 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
          {filteredWorkflows.map((workflow) => (
            <li key={workflow.id}>
              <WorkflowTemplateCard
                workflow={workflow}
                editorPath={`/admin/templates/workflows/${workflow.id}`}
                deleting={deletingWorkflowId === workflow.id}
                onDelete={() => void deleteWorkflowTemplate(workflow)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
