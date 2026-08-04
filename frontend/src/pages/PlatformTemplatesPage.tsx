import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type Agent, type Skill, type TenantSummary } from "../lib/api";
import { translateApiError } from "../lib/translate-error";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import TabsBar from "../components/ui/TabsBar";
import Panel from "../components/ui/Panel";
import EmptyState from "../components/ui/EmptyState";

type Tab = "agents" | "skills";

export default function PlatformTemplatesPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("agents");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
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
      t("admin.templates.syncSection.stats.skillsAdded", { count: stats.skills.added }),
      t("admin.templates.syncSection.stats.skillsUpdated", { count: stats.skills.updated }),
      stats.skills.linked
        ? t("admin.templates.syncSection.stats.skillsLinked", { count: stats.skills.linked })
        : "",
      t("admin.templates.syncSection.stats.agentsAdded", { count: stats.agents.added }),
      t("admin.templates.syncSection.stats.agentsUpdated", { count: stats.agents.updated }),
      stats.agents.linked
        ? t("admin.templates.syncSection.stats.agentsLinked", { count: stats.agents.linked })
        : "",
      t("admin.templates.syncSection.stats.workflowsAdded", { count: stats.workflows.added }),
      t("admin.templates.syncSection.stats.workflowsUpdated", { count: stats.workflows.updated }),
      stats.workflows.linked
        ? t("admin.templates.syncSection.stats.workflowsLinked", { count: stats.workflows.linked })
        : "",
    ].filter((part) => part && !part.startsWith("0 "));
    return parts.length > 0 ? parts.join(", ") : t("common.noChanges");
  };

  const confirmUpdateMode = () => {
    if (syncMode !== "update") return true;
    return confirm(t("admin.templates.syncSection.updateConfirm"));
  };

  const syncTenants = async (tenantIds: string[]) => {
    if (tenantIds.length === 0) {
      setMessage(t("common.selectAtLeastOneTenant"));
      return;
    }
    if (!confirmUpdateMode()) return;

    setSyncLoading(true);
    setMessage(null);
    try {
      const result = await api.admin.templates.syncTenants({ tenantIds, mode: syncMode });
      setMessage(
        t("admin.templates.syncSection.syncSummary", {
          count: result.results.length,
          mode: result.mode,
          summary: result.results
            .map((entry) => `${entry.tenantName}: ${formatSyncStats(entry.stats)}`)
            .join(" · "),
        }),
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("common.syncFailed"));
    } finally {
      setSyncLoading(false);
    }
  };

  const syncToAllTenants = () => void syncTenants(tenants.map((t) => t.id));

  const load = async () => {
    const [a, s, tenantList] = await Promise.all([
      api.admin.templates.listAgents(),
      api.admin.templates.listSkills(),
      api.admin.tenants(),
    ]);
    setAgents(a);
    setSkills(s);
    setTenants(tenantList);
    setSelectedTenantIds((prev) => prev.filter((id) => tenantList.some((tenant) => tenant.id === id)));
  };

  useEffect(() => {
    void load();
  }, []);

  const reseed = async () => {
    setReseedLoading(true);
    setMessage(null);
    try {
      const result = await api.admin.templates.reseed();
      setMessage(t("admin.templates.syncSection.reseedSuccess", {
        agents: result.agents,
        skills: result.skills,
        workflows: result.workflows,
      }));
      await load();
    } catch (err) {
      setMessage(translateApiError(err, t, "common.reseedFailed"));
    } finally {
      setReseedLoading(false);
    }
  };

  const createAgent = async () => {
    const name = prompt(t("admin.templates.agents.agentNamePrompt"));
    if (!name?.trim()) return;
    const role = prompt(t("admin.templates.agents.rolePrompt"), name.trim()) ?? name.trim();
    try {
      const agent = await api.admin.templates.createAgent({
        name: name.trim(),
        role: role.trim(),
        systemPrompt: `You are ${name.trim()}, ${role.trim()}.`,
      });
      await load();
      setSelectedAgent(agent);
      setMessage(t("admin.templates.agents.created", { name: agent.name }));
    } catch (err) {
      setMessage(translateApiError(err, t, "common.createFailed"));
    }
  };

  const createSkill = async () => {
    const name = prompt(t("admin.templates.skills.skillNamePrompt"));
    if (!name?.trim()) return;
    try {
      const skill = await api.admin.templates.createSkill({
        name: name.trim(),
        description: `Platform skill: ${name.trim()}`,
        promptContent: `# ${name.trim()}\n\nDescribe how agents should use this skill.`,
      });
      await load();
      setSelectedSkill(skill);
      setMessage(t("admin.templates.skills.created", { name: skill.name }));
    } catch (err) {
      setMessage(translateApiError(err, t, "common.createFailed"));
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
    setMessage(t("admin.templates.agents.saved"));
  };

  const saveSkill = async () => {
    if (!selectedSkill) return;
    await api.admin.templates.updateSkill(selectedSkill.id, {
      name: selectedSkill.name,
      description: selectedSkill.description,
      promptContent: selectedSkill.promptContent,
    });
    await load();
    setMessage(t("admin.templates.skills.saved"));
  };

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col gap-4 overflow-hidden sm:h-[calc(100dvh-8rem)] sm:gap-6">
      <PageHeader
        eyebrow={
          <Breadcrumbs
            items={[
              { label: t("nav.admin"), to: "/admin" },
              { label: t("admin.templates.title") },
            ]}
          />
        }
        title={t("admin.templates.title")}
        subtitle={t("admin.templates.subtitle")}
        actions={
          <Button disabled={reseedLoading} onClick={() => void reseed()} fullWidthMobile>
            {reseedLoading ? t("common.reseeding") : t("admin.templates.reseed")}
          </Button>
        }
      />

      <Panel
        title={t("admin.templates.syncSection.title")}
        subtitle={t("admin.templates.syncSection.subtitle")}
        bodySize="sm"
      >
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="syncMode"
              checked={syncMode === "merge"}
              onChange={() => setSyncMode("merge")}
            />
            {t("admin.templates.syncSection.mergeLabel")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="syncMode"
              checked={syncMode === "update"}
              onChange={() => setSyncMode("update")}
            />
            {t("admin.templates.syncSection.updateLabel")}
          </label>
          <Button
            variant="secondary"
            disabled={syncLoading}
            onClick={() => void syncToAllTenants()}
          >
            {syncLoading ? t("common.syncing") : t("admin.templates.syncSection.syncAll")}
          </Button>
          <Button
            disabled={syncLoading || selectedTenantIds.length === 0}
            onClick={() => void syncTenants(selectedTenantIds)}
          >
            {syncLoading
              ? t("common.syncing")
              : t("admin.templates.syncSection.syncSelected", { count: selectedTenantIds.length })}
          </Button>
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
      </Panel>

      {message && (
        <p className="shrink-0 app-alert app-alert--info px-4 py-2 text-sm" role="status">
          {message}
        </p>
      )}

      <TabsBar
        sticky
        tabs={(["agents", "skills"] as Tab[]).map((tabKey) => ({
          id: tabKey,
          label: t(`admin.templates.tabs.${tabKey}`),
        }))}
        activeId={tab}
        onChange={(id) => setTab(id as Tab)}
      />

      {tab === "agents" && (
        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-2">
          <div className="flex min-h-0 flex-col gap-2">
            <Button
              variant="secondary"
              onClick={() => void createAgent()}
              className="shrink-0 w-full border-dashed"
            >
              + {t("admin.templates.agents.createTemplate")}
            </Button>
            {agents.length === 0 ? (
              <EmptyState
                title={t("admin.templates.agents.emptyTitle")}
                description={t("admin.templates.agents.emptyHint")}
              />
            ) : (
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
            )}
          </div>
          {selectedAgent && (
            <Panel title={selectedAgent.name} subtitle={selectedAgent.role} bodySize="sm" className="flex min-h-0 flex-col">
              <textarea
                value={selectedAgent.systemPrompt}
                onChange={(e) => setSelectedAgent({ ...selectedAgent, systemPrompt: e.target.value })}
                className="min-h-[280px] flex-1 resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 font-mono text-xs"
              />
              <Button onClick={() => void saveAgent()} className="mt-3 shrink-0">
                {t("admin.templates.agents.saveTemplate")}
              </Button>
            </Panel>
          )}
        </div>
      )}

      {tab === "skills" && (
        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-2">
          <div className="flex min-h-0 flex-col gap-2">
            <Button
              variant="secondary"
              onClick={() => void createSkill()}
              className="shrink-0 w-full border-dashed"
            >
              + {t("admin.templates.skills.createTemplate")}
            </Button>
            {skills.length === 0 ? (
              <EmptyState
                title={t("admin.templates.skills.emptyTitle")}
                description={t("admin.templates.skills.emptyHint")}
              />
            ) : (
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
            )}
          </div>
          {selectedSkill && (
            <Panel title={selectedSkill.name} bodySize="sm" className="flex min-h-0 flex-col">
              <textarea
                value={selectedSkill.promptContent}
                onChange={(e) => setSelectedSkill({ ...selectedSkill, promptContent: e.target.value })}
                className="min-h-[280px] flex-1 resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 font-mono text-xs"
              />
              <Button onClick={() => void saveSkill()} className="mt-3 shrink-0">
                {t("admin.templates.skills.saveTemplate")}
              </Button>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
