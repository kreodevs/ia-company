import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, Sparkles } from "lucide-react";
import { api, type OfficeProcedureGroup, type OfficeProcedureSummary, type Workflow } from "../lib/api";
import WorkflowTemplateCard from "../components/WorkflowTemplateCard";
import WorkflowAiStudioModal from "../components/workflows/WorkflowAiStudioModal";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import EmptyState from "../components/ui/EmptyState";
import Panel from "../components/ui/Panel";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

function groupLabel(
  group: OfficeProcedureGroup,
  t: (key: string) => string,
): string {
  if (group.orgUnitName) return group.orgUnitName;
  if (group.departmentSlug) {
    return t(`office.departments.${group.departmentSlug}.name` as "office.departments.strategy.name");
  }
  return t("office.procedures.unassignedGroup");
}

function procedureToWorkflowCard(procedure: OfficeProcedureSummary): Workflow {
  return {
    id: procedure.id,
    name: procedure.name,
    description: procedure.description,
    steps: procedure.agentNames.map((agentName, index) => ({
      id: `${procedure.id}-${index}`,
      agentId: agentName,
      stepOrder: index + 1,
      label: agentName.replace(/-/g, " "),
      positionX: 0,
      positionY: 0,
      inputConfig: {},
      outputConfig: {},
      agent: {
        id: agentName,
        name: agentName,
        role: agentName.replace(/-/g, " "),
        systemPrompt: "",
        provider: null,
        model: null,
        modelKind: "chat" as const,
        temperature: 0,
        isActive: true,
        skills: [],
      },
    })),
    edges: [],
  };
}

export default function ProceduresSettingsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [groups, setGroups] = useState<OfficeProcedureGroup[]>([]);
  const [unassigned, setUnassigned] = useState<OfficeProcedureSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingWorkflowId, setDeletingWorkflowId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [aiOpen, setAiOpen] = useState(false);

  const load = async () => {
    const data = await api.office.proceduresGrouped();
    setGroups(data.groups);
    setUnassigned(data.unassigned);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const totalCount = useMemo(
    () => groups.reduce((sum, group) => sum + group.items.length, 0) + unassigned.length,
    [groups, unassigned],
  );

  const matchesSearch = (procedure: OfficeProcedureSummary) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [procedure.name, procedure.procedureLabel, procedure.description ?? "", ...procedure.agentNames]
      .join(" ")
      .toLowerCase()
      .includes(query);
  };

  const filteredGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items.filter(matchesSearch),
        }))
        .filter((group) => group.items.length > 0),
    [groups, search],
  );

  const filteredUnassigned = useMemo(
    () => unassigned.filter(matchesSearch),
    [unassigned, search],
  );

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

  const deleteProcedure = async (procedure: OfficeProcedureSummary) => {
    if (!confirm(t("workflows.list.deleteConfirm", { name: procedure.procedureLabel }))) return;
    setDeletingWorkflowId(procedure.id);
    try {
      await api.workflows.delete(procedure.id);
      await load();
    } finally {
      setDeletingWorkflowId(null);
    }
  };

  if (loading) return <PageLoading message={t("office.procedures.loading")} />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Breadcrumbs
            items={[
              { label: t("nav.settings"), to: "/settings" },
              { label: t("nav.procedures") },
            ]}
          />
        }
        title={t("nav.procedures")}
        subtitle={t("office.procedures.settingsSubtitle")}
        meta={
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {totalCount} {t("office.procedures.settingsCountLabel")}
          </p>
        }
      />

      <Panel bodySize="sm" className="border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t("office.procedures.settingsHint")}{" "}
          <Link to="/org-units" className="text-[var(--color-primary)] underline">
            {t("nav.orgUnits")}
          </Link>
        </p>
      </Panel>

      <Panel title={t("office.procedures.searchPlaceholder")} bodySize="sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <Input
              label={t("office.procedures.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("office.procedures.searchPlaceholder")}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Input
                label={t("office.procedures.newNamePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("office.procedures.newNamePlaceholder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void createWorkflow();
                }}
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => setAiOpen(true)}
              fullWidthMobile
              className="sm:mb-0.5"
              aria-label={t("workflows.ai.open")}
            >
              <Sparkles className="mr-1.5 h-4 w-4" aria-hidden />
              {t("workflows.ai.open")}
            </Button>
            <Button
              disabled={creating || !name.trim()}
              onClick={() => void createWorkflow()}
              fullWidthMobile
              className="sm:mb-0.5"
            >
              {creating ? t("common.creating") : t("office.procedures.createAndEdit")}
            </Button>
          </div>
        </div>
      </Panel>

      <WorkflowAiStudioModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onApplied={() => void load()}
      />

      {filteredGroups.length === 0 && filteredUnassigned.length === 0 ? (
        <EmptyState
          title={totalCount === 0 ? t("office.procedures.empty") : t("workflows.list.emptySearchTitle")}
          description={
            totalCount === 0
              ? t("office.procedures.settingsEmptySubtitle")
              : t("workflows.list.emptySearchSubtitle")
          }
        />
      ) : (
        <div className="space-y-8">
          {filteredGroups.map((group) => (
            <Panel
              key={`${group.departmentSlug ?? "org"}-${group.orgUnitId ?? "virtual"}`}
              title={
                <span className="inline-flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[var(--color-muted-foreground)]" aria-hidden />
                  {groupLabel(group, t)}
                </span>
              }
              actions={
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {t("office.procedures.groupCount", { count: group.items.length })}
                </span>
              }
              bodySize="sm"
            >
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.items.map((procedure) => (
                  <li key={procedure.id}>
                    <WorkflowTemplateCard
                      workflow={procedureToWorkflowCard(procedure)}
                      editorPath={`/office/workflows/${procedure.id}`}
                      deleting={deletingWorkflowId === procedure.id}
                      onDelete={() => void deleteProcedure(procedure)}
                      hideSlug
                    />
                  </li>
                ))}
              </ul>
            </Panel>
          ))}

          {filteredUnassigned.length > 0 ? (
            <Panel
              title={t("office.procedures.unassignedGroup")}
              actions={
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {t("office.procedures.groupCount", { count: filteredUnassigned.length })}
                </span>
              }
              bodySize="sm"
            >
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredUnassigned.map((procedure) => (
                  <li key={procedure.id}>
                    <WorkflowTemplateCard
                      workflow={procedureToWorkflowCard(procedure)}
                      editorPath={`/office/workflows/${procedure.id}`}
                      deleting={deletingWorkflowId === procedure.id}
                      onDelete={() => void deleteProcedure(procedure)}
                      hideSlug
                    />
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      )}
    </div>
  );
}
