import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type Workflow } from "../lib/api";
import WorkflowTemplateCard from "../components/WorkflowTemplateCard";
import { formatWorkflowTitle } from "../lib/workflow-display";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import EmptyState from "../components/ui/EmptyState";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      await navigate(`/office/workflows/${workflow.id}`);
    } finally {
      setCreating(false);
    }
  };

  const deleteWorkflow = async (workflow: Workflow) => {
    if (!confirm(t("workflows.list.deleteConfirm", { name: workflow.name }))) return;
    setDeletingWorkflowId(workflow.id);
    try {
      await api.workflows.delete(workflow.id);
      await load();
    } finally {
      setDeletingWorkflowId(null);
    }
  };

  if (loading) return <PageLoading message={t("workflows.list.loading")} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.workflows")}
        subtitle={t("workflows.list.subtitle")}
        meta={
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {filteredWorkflows.length} {t("common.of")} {workflows.length}
          </p>
        }
      />

      <Card padding="sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <Input
              label={t("workflows.list.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("workflows.list.searchPlaceholder")}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Input
                label={t("workflows.list.newNamePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("workflows.list.newNamePlaceholder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void createWorkflow();
                }}
              />
            </div>
            <Button
              disabled={creating || !name.trim()}
              onClick={() => void createWorkflow()}
              fullWidthMobile
              className="sm:mb-0.5"
            >
              {creating ? t("common.creating") : t("workflows.list.createAndEdit")}
            </Button>
          </div>
        </div>
      </Card>

      {filteredWorkflows.length === 0 ? (
        <EmptyState
          title={
            workflows.length === 0 ? t("workflows.list.emptyTitle") : t("workflows.list.emptySearchTitle")
          }
          description={
            workflows.length === 0
              ? t("workflows.list.emptySubtitle")
              : t("workflows.list.emptySearchSubtitle")
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredWorkflows.map((workflow) => (
            <li key={workflow.id}>
              <WorkflowTemplateCard
                workflow={workflow}
                editorPath={`/office/workflows/${workflow.id}`}
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
