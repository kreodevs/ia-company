import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import WorkflowTemplateCard from "../components/WorkflowTemplateCard";
import { api, type Agent, type Skill, type TenantSummary, type Workflow } from "../lib/api";
import { formatWorkflowTitle } from "../lib/workflow-display";

type Tab = "agents" | "skills" | "workflows";

export default function PlatformTemplatesPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("agents");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [reseedLoading, setReseedLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMode, setSyncMode] = useState<"merge" | "update">("merge");
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [creatingWorkflow, setCreatingWorkflow] = useState(false);
  const [deletingWorkflowId, setDeletingWorkflowId] = useState<string | null>(null);
  const [workflowSearch, setWorkflowSearch] = useState("");

  const formatSyncStats = (stats: {
    skills: { added: number; updated: number; linked?: number };
    agents: { added: number; updated: number; linked?: number };
    workflows: { added: number; updated: number; linked?: number };
  }) => {
    const parts = [
      `${stats.skills.added} skills added`,
      `${stats.skills.updated} skills updated`,
      stats.skills.linked ? `${stats.skills.linked} skills linked` : "",
      `${stats.agents.added} agents added`,
      `${stats.agents.updated} agents updated`,
      stats.agents.linked ? `${stats.agents.linked} agents linked` : "",
      `${stats.workflows.added} workflows added`,
      `${stats.workflows.updated} workflows updated`,
      stats.workflows.linked ? `${stats.workflows.linked} workflows linked` : "",
    ].filter((part) => part && !part.startsWith("0 "));
    return parts.length > 0 ? parts.join(", ") : "No changes";
  };

  const confirmUpdateMode = () => {
    if (syncMode !== "update") return true;
    return confirm(
      "Update mode overwrites matching tenant agents/skills/workflows from platform templates (matched by platform id or name). Continue?",
    );
  };

  const syncTenants = async (tenantIds: string[]) => {
    if (tenantIds.length === 0) {
      setMessage("Select at least one tenant");
      return;
    }
    if (!confirmUpdateMode()) return;

    setSyncLoading(true);
    setMessage(null);
    try {
      const result = await api.admin.templates.syncTenants({ tenantIds, mode: syncMode });
      const summary = result.results
        .map((entry) => `${entry.tenantName}: ${formatSyncStats(entry.stats)}`)
        .join(" · ");
      setMessage(`Synced ${result.results.length} tenant(s) (${result.mode}): ${summary}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncLoading(false);
    }
  };

  const syncToAllTenants = () => void syncTenants(tenants.map((t) => t.id));

  const load = async () => {
    const [a, s, w, t] = await Promise.all([
      api.admin.templates.listAgents(),
      api.admin.templates.listSkills(),
      api.admin.templates.listWorkflows(),
      api.admin.tenants(),
    ]);
    setAgents(a);
    setSkills(s);
    setWorkflows(w);
    setTenants(t);
    setSelectedTenantIds((prev) => prev.filter((id) => t.some((tenant) => tenant.id === id)));
  };

  useEffect(() => {
    void load();
  }, []);

  const reseed = async () => {
    setReseedLoading(true);
    setMessage(null);
    try {
      const result = await api.admin.templates.reseed();
      setMessage(`Reseeded ${result.agents} agents, ${result.skills} skills, ${result.workflows} workflows`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Reseed failed");
    } finally {
      setReseedLoading(false);
    }
  };

  const createAgent = async () => {
    const name = prompt("Agent template name");
    if (!name?.trim()) return;
    const role = prompt("Role label", name.trim()) ?? name.trim();
    try {
      const agent = await api.admin.templates.createAgent({
        name: name.trim(),
        role: role.trim(),
        systemPrompt: `You are ${name.trim()}, ${role.trim()}.`,
      });
      await load();
      setSelectedAgent(agent);
      setMessage(`Created agent template "${agent.name}"`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Create failed");
    }
  };

  const createSkill = async () => {
    const name = prompt("Skill template name");
    if (!name?.trim()) return;
    try {
      const skill = await api.admin.templates.createSkill({
        name: name.trim(),
        description: `Platform skill: ${name.trim()}`,
        promptContent: `# ${name.trim()}\n\nDescribe how agents should use this skill.`,
      });
      await load();
      setSelectedSkill(skill);
      setMessage(`Created skill template "${skill.name}"`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Create failed");
    }
  };

  const saveAgent = async () => {
    if (!selectedAgent) return;
    await api.admin.templates.updateAgent(selectedAgent.id, {
      name: selectedAgent.name,
      role: selectedAgent.role,
      systemPrompt: selectedAgent.systemPrompt,
      model: selectedAgent.model,
      provider: selectedAgent.provider,
      temperature: selectedAgent.temperature,
      skillIds: selectedAgent.skills.map((s) => s.skill.id),
    });
    await load();
    setMessage("Agent template saved");
  };

  const saveSkill = async () => {
    if (!selectedSkill) return;
    await api.admin.templates.updateSkill(selectedSkill.id, {
      name: selectedSkill.name,
      description: selectedSkill.description,
      promptContent: selectedSkill.promptContent,
    });
    await load();
    setMessage("Skill template saved");
  };

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
      setMessage(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreatingWorkflow(false);
    }
  };

  const deleteWorkflowTemplate = async (workflow: Workflow) => {
    if (!confirm(`Delete platform workflow template "${workflow.name}"?`)) return;
    setDeletingWorkflowId(workflow.id);
    setMessage(null);
    try {
      await api.admin.templates.deleteWorkflow(workflow.id);
      await load();
      setMessage(`Deleted workflow template "${workflow.name}"`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingWorkflowId(null);
    }
  };

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col gap-4 overflow-hidden sm:h-[calc(100dvh-8rem)] sm:gap-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/admin" className="text-sm text-[var(--color-muted-foreground)] hover:underline">
            ← Admin
          </Link>
          <h1 className="mt-1 text-2xl font-bold">Platform Templates</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Global templates cloned to new tenants · sourced from <code>.claude/</code>
          </p>
        </div>
        <button
          disabled={reseedLoading}
          onClick={() => void reseed()}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
        >
          {reseedLoading ? "Reseeding…" : "Reseed from .claude/"}
        </button>
      </div>

      <div className="shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
        <h2 className="font-semibold">Sync to existing tenants</h2>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Push platform templates to existing tenants. Matching uses platform id (rename-safe), then
          name.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="syncMode"
              checked={syncMode === "merge"}
              onChange={() => setSyncMode("merge")}
            />
            Merge — add missing only
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="syncMode"
              checked={syncMode === "update"}
              onChange={() => setSyncMode("update")}
            />
            Update — also overwrite matching templates
          </label>
          <button
            disabled={syncLoading}
            onClick={() => void syncToAllTenants()}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm disabled:opacity-50"
          >
            {syncLoading ? "Syncing…" : "Sync all tenants"}
          </button>
          <button
            disabled={syncLoading || selectedTenantIds.length === 0}
            onClick={() => void syncTenants(selectedTenantIds)}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm text-[var(--color-primary-foreground)] disabled:opacity-50"
          >
            {syncLoading ? "Syncing…" : `Sync selected (${selectedTenantIds.length})`}
          </button>
        </div>
        {tenants.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {tenants.map((tenant) => (
              <label key={tenant.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedTenantIds.includes(tenant.id)}
                  onChange={(e) => {
                    setSelectedTenantIds((prev) =>
                      e.target.checked
                        ? [...prev, tenant.id]
                        : prev.filter((id) => id !== tenant.id),
                    );
                  }}
                />
                {tenant.name}
              </label>
            ))}
          </div>
        )}
      </div>

      {message && (
        <p className="shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-2 text-sm">
          {message}
        </p>
      )}

      <div className="flex shrink-0 flex-wrap gap-2">
        {(["agents", "skills", "workflows"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm capitalize ${
              tab === t
                ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                : "border border-[var(--color-border)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "agents" && (
        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-2">
          <div className="flex min-h-0 flex-col gap-2">
            <button
              onClick={() => void createAgent()}
              className="shrink-0 w-full rounded-lg border border-dashed border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-muted)]"
            >
              + Create agent template
            </button>
            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {agents.map((agent) => (
                <li key={agent.id}>
                  <button
                    onClick={() => setSelectedAgent(agent)}
                    className={`w-full rounded-xl border px-4 py-3 text-left ${
                      selectedAgent?.id === agent.id
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                        : "border-[var(--color-border)] bg-[var(--color-card)]"
                    }`}
                  >
                    <div className="font-medium">{agent.name}</div>
                    <div className="text-xs text-[var(--color-muted-foreground)]">{agent.role}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {selectedAgent && (
            <div className="flex min-h-0 flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
              <textarea
                value={selectedAgent.systemPrompt}
                onChange={(e) => setSelectedAgent({ ...selectedAgent, systemPrompt: e.target.value })}
                className="min-h-0 flex-1 resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 font-mono text-xs"
              />
              <button
                onClick={() => void saveAgent()}
                className="shrink-0 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm text-[var(--color-primary-foreground)]"
              >
                Save agent template
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "skills" && (
        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-2">
          <div className="flex min-h-0 flex-col gap-2">
            <button
              onClick={() => void createSkill()}
              className="shrink-0 w-full rounded-lg border border-dashed border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-muted)]"
            >
              + Create skill template
            </button>
            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {skills.map((skill) => (
                <li key={skill.id}>
                  <button
                    onClick={() => setSelectedSkill(skill)}
                    className={`w-full rounded-xl border px-4 py-3 text-left ${
                      selectedSkill?.id === skill.id
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                        : "border-[var(--color-border)] bg-[var(--color-card)]"
                    }`}
                  >
                    {skill.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {selectedSkill && (
            <div className="flex min-h-0 flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
              <textarea
                value={selectedSkill.promptContent}
                onChange={(e) => setSelectedSkill({ ...selectedSkill, promptContent: e.target.value })}
                className="min-h-0 flex-1 resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 font-mono text-xs"
              />
              <button
                onClick={() => void saveSkill()}
                className="shrink-0 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm text-[var(--color-primary-foreground)]"
              >
                Save skill template
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "workflows" && (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="shrink-0 space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-semibold">Workflow templates</h2>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  Global pipelines cloned to new tenants. Open a template to edit agents and
                  connections in the visual editor.
                </p>
              </div>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {filteredWorkflows.length} of {workflows.length}
              </p>
            </div>
            <div className="flex flex-col gap-2 lg:flex-row">
              <input
                value={workflowSearch}
                onChange={(e) => setWorkflowSearch(e.target.value)}
                placeholder="Search workflows or agents…"
                className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              />
              <div className="flex min-w-0 flex-1 gap-2">
                <input
                  value={newWorkflowName}
                  onChange={(e) => setNewWorkflowName(e.target.value)}
                  placeholder="new-workflow-name"
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
                  {creatingWorkflow ? "Creating…" : "Create & edit"}
                </button>
              </div>
            </div>
          </div>

          {filteredWorkflows.length === 0 ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)]/40 px-6 py-12 text-center">
              <p className="font-medium">
                {workflows.length === 0 ? "No workflow templates yet" : "No workflows match your search"}
              </p>
              <p className="mt-2 max-w-md text-sm text-[var(--color-muted-foreground)]">
                {workflows.length === 0
                  ? "Create a template to define a reusable agent pipeline for every new tenant."
                  : "Try another search term or clear the filter."}
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
      )}
    </div>
  );
}
