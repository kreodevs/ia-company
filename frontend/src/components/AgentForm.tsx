import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type Agent, type Skill } from "../lib/api";
import { translateApiError } from "../lib/translate-error";
import AgentModelFields from "./AgentModelFields";

interface AgentFormProps {
  agent: Agent | null;
  skills: Skill[];
  onSave: () => void;
  onCancel: () => void;
}

type ProviderChoice = "inherit" | NonNullable<Agent["provider"]>;

function agentToForm(agent: Agent | null) {
  return {
    name: agent?.name ?? "",
    role: agent?.role ?? "",
    systemPrompt: agent?.systemPrompt ?? "",
    provider: (agent?.provider ?? "inherit") as ProviderChoice,
    model: agent?.model ?? "",
    modelKind: agent?.modelKind ?? "chat",
    temperature: agent?.temperature ?? 0.7,
    isActive: agent?.isActive ?? true,
    skillIds: agent?.skills.map((s) => s.skill.id) ?? [],
  };
}

export default function AgentForm({ agent, skills, onSave, onCancel }: AgentFormProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => agentToForm(agent));
  const [aiBrief, setAiBrief] = useState("");
  const [improving, setImproving] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(agentToForm(agent));
    setError(null);
    setInfo(null);
  }, [agent]);

  const payload = useMemo(
    () => ({
      ...form,
      provider: form.provider === "inherit" ? null : form.provider,
      model: form.model.trim() ? form.model.trim() : null,
    }),
    [form],
  );

  const improveWithAi = async () => {
    const brief =
      aiBrief.trim() ||
      [form.role, form.systemPrompt].filter(Boolean).join(": ").trim();
    if (brief.length < 8) {
      setError(t("catalogStudio.briefPlaceholderAgent"));
      return;
    }
    setImproving(true);
    setError(null);
    setInfo(null);
    try {
      const proposal = await api.catalogStudio.agents.propose({ brief });
      if (proposal.reuse) {
        setInfo(t("catalogStudio.reuseExistingAgent", { name: proposal.reuse.existingAgentName }));
        return;
      }
      if (proposal.agent) {
        const skillIdSet = new Set(form.skillIds);
        for (const skillName of [
          ...proposal.existingSkillNames,
          ...(proposal.agent.skillNames ?? []),
        ]) {
          const match = skills.find((s) => s.name === skillName);
          if (match) skillIdSet.add(match.id);
        }
        setForm({
          ...form,
          name: proposal.agent.name,
          role: proposal.agent.role,
          systemPrompt: proposal.agent.systemPrompt,
          skillIds: [...skillIdSet],
        });
        setInfo(t("catalogStudio.draftPrefilled"));
      }
    } catch (err) {
      setError(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setImproving(false);
    }
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      setError(null);
      try {
        if (agent) {
          await api.agents.update(agent.id, payload);
        } else {
          await api.agents.create(payload);
        }
        onSave();
      } catch (err) {
        setError(translateApiError(err, t, "common.saveFailed"));
      } finally {
        setSaving(false);
      }
    },
    [agent, onSave, payload, t],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
      <h2 className="text-lg font-semibold">
        {agent ? t("workflows.agents.editAgent") : t("workflows.agents.newAgentForm")}
      </h2>

      {error && (
        <p className="rounded-lg bg-[var(--color-destructive)]/15 px-3 py-2 text-sm text-[var(--color-destructive)]">
          {error}
        </p>
      )}

      {info && (
        <p className="rounded-lg bg-[var(--color-primary)]/10 px-3 py-2 text-sm text-[var(--color-foreground)]">
          {info}
        </p>
      )}

      {!agent && (
        <div className="space-y-2 rounded-lg border border-dashed border-[var(--color-border)] p-3">
          <label className="block text-sm">
            {t("catalogStudio.improveBriefLabel")}
            <textarea
              className="mt-1 h-20 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              value={aiBrief}
              onChange={(e) => setAiBrief(e.target.value)}
              placeholder={t("catalogStudio.improveBriefPlaceholder")}
            />
          </label>
          <button
            type="button"
            disabled={improving}
            onClick={() => void improveWithAi()}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-muted)]/30 disabled:opacity-50"
          >
            {improving ? t("catalogStudio.improving") : t("catalogStudio.improveWithAi")}
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          {t("common.name")}
          <input
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </label>
        <label className="block text-sm">
          {t("common.role")}
          <input
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            required
          />
        </label>
      </div>

      <AgentModelFields
        provider={form.provider}
        model={form.model}
        modelKind={form.modelKind}
        onProviderChange={(provider) => setForm({ ...form, provider })}
        onModelChange={(model) => setForm({ ...form, model })}
        onModelKindChange={(modelKind) => setForm({ ...form, modelKind })}
      />

      <label className="block text-sm">
        {t("common.temperature", { value: form.temperature })}
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          className="mt-2 w-full"
          value={form.temperature}
          onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          className="h-4 w-4"
        />
        {t("common.active")}
      </label>

      <label className="block text-sm">
        {t("common.systemPrompt")}
        <textarea
          className="mt-1 h-48 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 font-mono text-xs"
          value={form.systemPrompt}
          onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
          required
        />
      </label>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("nav.skills")}</legend>
        <div className="grid max-h-40 gap-2 overflow-y-auto md:grid-cols-2">
          {skills.map((skill) => (
            <label key={skill.id} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.skillIds.includes(skill.id)}
                onChange={(e) => {
                  setForm({
                    ...form,
                    skillIds: e.target.checked
                      ? [...form.skillIds, skill.id]
                      : form.skillIds.filter((id) => id !== skill.id),
                  });
                }}
              />
              <span>
                <span className="font-medium">{skill.name}</span>
                <span className="block text-xs text-[var(--color-muted-foreground)]">
                  {skill.description.slice(0, 80)}…
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
        >
          {saving ? t("common.saving") : t("common.save")}
        </button>
        {agent && (
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              if (!confirm(t("workflows.agents.deleteConfirm", { name: agent.name }))) return;
              setSaving(true);
              try {
                await api.agents.delete(agent.id);
                onSave();
              } catch (err) {
                setError(translateApiError(err, t, "common.deleteFailed"));
                setSaving(false);
              }
            }}
            className="rounded-lg border border-[var(--color-destructive)] px-4 py-2 text-sm text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10 disabled:opacity-50"
          >
            {t("common.delete")}
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm"
        >
          {t("common.cancel")}
        </button>
      </div>
    </form>
  );
}
