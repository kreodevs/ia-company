import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import AgentForm from "../components/AgentForm";
import { api, type Agent, type Skill } from "../lib/api";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";

export default function AgentsPage() {
  const { t } = useTranslation();
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

  if (loading) return <PageLoading message={t("workflows.agents.loading")} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.agents")}
        actions={
          <Button
            onClick={() => {
              setCreating(true);
              setSelected(null);
            }}
            fullWidthMobile
          >
            {t("workflows.agents.newAgent")}
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="min-w-0">
          <ul className="space-y-2">
            {agents.map((agent) => (
              <li key={agent.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(agent);
                    setCreating(false);
                  }}
                  className={`interactive w-full rounded-xl border px-4 py-3.5 text-left sm:py-3 ${
                    selected?.id === agent.id
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                      : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/50"
                  }`}
                >
                  <div className="font-medium">{agent.name}</div>
                  <div className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                    {agent.role} · {agent.model} · {agent.provider}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="min-w-0">
          {(selected || creating) && (
            <Card>
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
            </Card>
          )}
          {!selected && !creating && (
            <EmptyState title={t("workflows.agents.selectToEdit")} />
          )}
        </section>
      </div>
    </div>
  );
}
