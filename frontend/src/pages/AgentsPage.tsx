import { useEffect, useState } from "react";
import AgentForm from "../components/AgentForm";
import { api, type Agent, type Skill } from "../lib/api";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [a, s] = await Promise.all([api.agents.list(), api.skills.list()]);
    setAgents(a);
    setSkills(s);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <p className="text-[var(--color-muted-foreground)]">Loading agents…</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Agents</h1>
          <button
            onClick={() => {
              setCreating(true);
              setSelected(null);
            }}
            className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-[var(--color-primary-foreground)]"
          >
            New agent
          </button>
        </div>
        <ul className="space-y-2">
          {agents.map((agent) => (
            <li key={agent.id}>
              <button
                onClick={() => {
                  setSelected(agent);
                  setCreating(false);
                }}
                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                  selected?.id === agent.id
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                    : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/50"
                }`}
              >
                <div className="font-medium">{agent.name}</div>
                <div className="text-xs text-[var(--color-muted-foreground)]">
                  {agent.role} · {agent.model} · {agent.provider}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        {(selected || creating) && (
          <AgentForm
            agent={creating ? null : selected}
            skills={skills}
            onSave={() => {
              setCreating(false);
              void load();
            }}
            onCancel={() => {
              setCreating(false);
              setSelected(null);
            }}
          />
        )}
        {!selected && !creating && (
          <p className="text-[var(--color-muted-foreground)]">Select an agent to edit</p>
        )}
      </section>
    </div>
  );
}
