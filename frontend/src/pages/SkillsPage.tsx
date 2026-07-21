import { useEffect, useState } from "react";
import { api, type Skill } from "../lib/api";

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selected, setSelected] = useState<Skill | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", promptContent: "" });

  const load = async () => {
    setLoading(true);
    setSkills(await api.skills.list());
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setCreating(true);
    setSelected(null);
    setForm({ name: "", description: "", promptContent: "" });
  };

  const openEdit = (skill: Skill) => {
    setCreating(false);
    setSelected(skill);
    setForm({
      name: skill.name,
      description: skill.description,
      promptContent: skill.promptContent,
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      if (creating) {
        await api.skills.create(form);
      } else if (selected) {
        await api.skills.update(selected.id, form);
      }
      setCreating(false);
      setSelected(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this skill?")) return;
    await api.skills.delete(id);
    setSelected(null);
    await load();
  };

  if (loading) return <p className="text-[var(--color-muted-foreground)]">Loading skills…</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Skills</h1>
          <button
            onClick={openCreate}
            className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-[var(--color-primary-foreground)]"
          >
            New skill
          </button>
        </div>
        <ul className="space-y-2">
          {skills.map((skill) => (
            <li key={skill.id}>
              <button
                onClick={() => openEdit(skill)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                  selected?.id === skill.id
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                    : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/50"
                }`}
              >
                <div className="font-medium">{skill.name}</div>
                <div className="line-clamp-1 text-xs text-[var(--color-muted-foreground)]">
                  {skill.description}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        {(selected || creating) ? (
          <div className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
            <h2 className="font-semibold">{creating ? "Create skill" : "Edit skill"}</h2>
            <label className="block space-y-1 text-sm">
              <span>Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Description</span>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Prompt content</span>
              <textarea
                value={form.promptContent}
                onChange={(e) => setForm({ ...form, promptContent: e.target.value })}
                rows={12}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 font-mono text-xs"
              />
            </label>
            <div className="flex gap-2">
              <button
                disabled={saving || !form.name.trim()}
                onClick={() => void save()}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              {!creating && selected && (
                <button
                  onClick={() => void remove(selected.id)}
                  className="rounded-lg border border-[var(--color-destructive)] px-4 py-2 text-sm text-[var(--color-destructive)]"
                >
                  Delete
                </button>
              )}
              <button
                onClick={() => {
                  setCreating(false);
                  setSelected(null);
                }}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[var(--color-muted-foreground)]">Select a skill to edit</p>
        )}
      </section>
    </div>
  );
}
