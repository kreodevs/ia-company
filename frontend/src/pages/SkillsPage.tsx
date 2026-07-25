import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type Skill } from "../lib/api";
import { translateApiError } from "../lib/translate-error";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";

export default function SkillsPage({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selected, setSelected] = useState<Skill | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", promptContent: "" });
  const [aiBrief, setAiBrief] = useState("");
  const [improving, setImproving] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

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
    setAiBrief("");
    setInfo(null);
  };

  const improveWithAi = async () => {
    const brief =
      aiBrief.trim() ||
      [form.name, form.description].filter(Boolean).join(": ").trim();
    if (brief.length < 8) return;
    setImproving(true);
    setInfo(null);
    try {
      const proposal = await api.catalogStudio.skills.propose({ brief });
      if (proposal.reuse) {
        setInfo(t("catalogStudio.reuseExistingSkill", { name: proposal.reuse.existingSkillName }));
        return;
      }
      if (proposal.skill) {
        setForm({
          name: proposal.skill.name,
          description: proposal.skill.description,
          promptContent: proposal.skill.promptContent,
        });
        setInfo(t("catalogStudio.draftPrefilled"));
      }
    } catch (err) {
      setInfo(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setImproving(false);
    }
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
    if (!confirm(t("workflows.skills.deleteConfirm"))) return;
    await api.skills.delete(id);
    setSelected(null);
    await load();
  };

  if (loading) return <PageLoading message={t("workflows.skills.loading")} />;

  return (
    <div className="space-y-6">
      {!embedded && (
        <PageHeader
          title={t("nav.skills")}
          actions={
            <Button onClick={openCreate} fullWidthMobile>
              {t("workflows.skills.newSkill")}
            </Button>
          }
        />
      )}

      {embedded && (
        <div className="flex justify-end">
          <Button onClick={openCreate} fullWidthMobile>
            {t("workflows.skills.newSkill")}
          </Button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="min-w-0">
          <ul className="space-y-2">
            {skills.map((skill) => (
              <li key={skill.id}>
                <button
                  type="button"
                  onClick={() => openEdit(skill)}
                  className={`interactive w-full rounded-xl border px-4 py-3.5 text-left sm:py-3 ${
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

        <section className="min-w-0">
          {selected || creating ? (
            <Card className="space-y-4">
              <h2 className="font-semibold">
                {creating ? t("workflows.skills.createSkill") : t("workflows.skills.editSkill")}
              </h2>
              {info && (
                <p className="rounded-lg bg-[var(--color-primary)]/10 px-3 py-2 text-sm">{info}</p>
              )}
              {creating && (
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
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={improving}
                    onClick={() => void improveWithAi()}
                  >
                    {improving ? t("catalogStudio.improving") : t("catalogStudio.improveWithAi")}
                  </Button>
                </div>
              )}
              <Input
                label={t("common.name")}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                label={t("common.description")}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">{t("common.promptContent")}</span>
                <textarea
                  value={form.promptContent}
                  onChange={(e) => setForm({ ...form, promptContent: e.target.value })}
                  rows={12}
                  className="interactive w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2.5 font-mono text-xs sm:py-2"
                />
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button disabled={saving || !form.name.trim()} onClick={() => void save()} fullWidthMobile>
                  {saving ? t("common.saving") : t("common.save")}
                </Button>
                {!creating && selected && (
                  <Button variant="destructive" onClick={() => void remove(selected.id)} fullWidthMobile>
                    {t("common.delete")}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => {
                    setCreating(false);
                    setSelected(null);
                  }}
                  fullWidthMobile
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </Card>
          ) : (
            <EmptyState title={t("workflows.skills.selectToEdit")} />
          )}
        </section>
      </div>
    </div>
  );
}
