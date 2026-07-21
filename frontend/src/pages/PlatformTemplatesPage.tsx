import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Agent, type Skill, type Workflow } from "../lib/api";

type Tab = "agents" | "skills" | "workflows";

export default function PlatformTemplatesPage() {
  const [tab, setTab] = useState<Tab>("agents");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [reseedLoading, setReseedLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    const [a, s, w] = await Promise.all([
      api.admin.templates.listAgents(),
      api.admin.templates.listSkills(),
      api.admin.templates.listWorkflows(),
    ]);
    setAgents(a);
    setSkills(s);
    setWorkflows(w);
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

      {message && (
        <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-2 text-sm">
          {message}
        </p>
      )}

      <div className="flex gap-2">
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
        <ul className="space-y-3">
          {workflows.map((wf) => (
            <li
              key={wf.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
            >
              <div className="font-semibold">{wf.name}</div>
              <p className="text-sm text-[var(--color-muted-foreground)]">{wf.description}</p>
              <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                {wf.steps.length} steps · {wf.edges.length} edges
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
