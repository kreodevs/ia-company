import { useCallback, useState } from "react";
import { api, type Agent, type Skill } from "../lib/api";

interface AgentFormProps {
  agent: Agent | null;
  skills: Skill[];
  onSave: () => void;
  onCancel: () => void;
}

export default function AgentForm({ agent, skills, onSave, onCancel }: AgentFormProps) {
  const [form, setForm] = useState({
    name: agent?.name ?? "",
    role: agent?.role ?? "",
    systemPrompt: agent?.systemPrompt ?? "",
    provider: agent?.provider ?? "tokenlab",
    model: agent?.model ?? "claude-3-5-sonnet-20241022",
    temperature: agent?.temperature ?? 0.7,
    isActive: agent?.isActive ?? true,
    skillIds: agent?.skills.map((s) => s.skill.id) ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      setError(null);
      try {
        if (agent) {
          await api.agents.update(agent.id, form);
        } else {
          await api.agents.create(form);
        }
        onSave();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [agent, form, onSave],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
      <h2 className="text-lg font-semibold">{agent ? "Edit Agent" : "New Agent"}</h2>

      {error && (
        <p className="rounded-lg bg-[var(--color-destructive)]/15 px-3 py-2 text-sm text-[var(--color-destructive)]">
          {error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          Name
          <input
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </label>
        <label className="block text-sm">
          Role
          <input
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            required
          />
        </label>
        <label className="block text-sm">
          Provider
          <select
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            value={form.provider}
            onChange={(e) =>
              setForm({ ...form, provider: e.target.value as Agent["provider"] })
            }
          >
            <option value="tokenlab">TokenLab / LemonData</option>
            <option value="openrouter">OpenRouter</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label className="block text-sm">
          Model
          <input
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
          />
        </label>
        <label className="block text-sm md:col-span-2">
          Temperature ({form.temperature})
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
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="h-4 w-4"
          />
          Active
        </label>
      </div>

      <label className="block text-sm">
        System Prompt
        <textarea
          className="mt-1 h-48 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 font-mono text-xs"
          value={form.systemPrompt}
          onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
          required
        />
      </label>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Skills</legend>
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
          {saving ? "Saving…" : "Save"}
        </button>
        {agent && (
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              if (!confirm(`Delete agent "${agent.name}"?`)) return;
              setSaving(true);
              try {
                await api.agents.delete(agent.id);
                onSave();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Delete failed");
                setSaving(false);
              }
            }}
            className="rounded-lg border border-[var(--color-destructive)] px-4 py-2 text-sm text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10 disabled:opacity-50"
          >
            Delete
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
