import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type Agent, type Skill, type TenantSummary, type Workflow } from "../lib/api";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
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

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
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
        <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-2 text-sm">
          {message}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
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
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <button
              onClick={() => void createAgent()}
              className="w-full rounded-lg border border-dashed border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-muted)]"
            >
              + Create agent template
            </button>
            <ul className="space-y-2">
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
            <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
              <textarea
                value={selectedAgent.systemPrompt}
                onChange={(e) => setSelectedAgent({ ...selectedAgent, systemPrompt: e.target.value })}
                rows={16}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 font-mono text-xs"
              />
              <button
                onClick={() => void saveAgent()}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm text-[var(--color-primary-foreground)]"
              >
                Save agent template
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "skills" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <button
              onClick={() => void createSkill()}
              className="w-full rounded-lg border border-dashed border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-muted)]"
            >
              + Create skill template
            </button>
            <ul className="space-y-2">
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
            <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
              <textarea
                value={selectedSkill.promptContent}
                onChange={(e) => setSelectedSkill({ ...selectedSkill, promptContent: e.target.value })}
                rows={16}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 font-mono text-xs"
              />
              <button
                onClick={() => void saveSkill()}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm text-[var(--color-primary-foreground)]"
              >
                Save skill template
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "workflows" && (
        <div className="space-y-4">
          <button
            onClick={() => {
              const name = prompt("Workflow template name");
              if (!name?.trim()) return;
              void api.admin.templates
                .createWorkflow({ name: name.trim() })
                .then((wf) => navigate(`/admin/templates/workflows/${wf.id}`))
                .catch((err) => setMessage(err instanceof Error ? err.message : "Create failed"));
            }}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)]"
          >
            + Create workflow template
          </button>
          <ul className="space-y-3">
            {workflows.map((wf) => (
              <li
                key={wf.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
              >
                <Link
                  to={`/admin/templates/workflows/${wf.id}`}
                  className="block hover:opacity-90"
                >
                  <div className="font-semibold">{wf.name}</div>
                  <p className="text-sm text-[var(--color-muted-foreground)]">{wf.description}</p>
                  <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                    {wf.steps.length} steps · {wf.edges.length} edges · Open visual editor →
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
