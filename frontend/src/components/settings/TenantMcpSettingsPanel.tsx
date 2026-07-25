import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type Agent, type TenantMcpServer } from "../../lib/api";

const emptyForm = {
  name: "",
  command: "",
  argsJson: "",
  envJson: "",
  description: "",
  readOnly: true,
  maxCallsPerRun: 30,
  enabled: true,
  agentIds: [] as string[],
};

export default function TenantMcpSettingsPanel() {
  const { t } = useTranslation();
  const [servers, setServers] = useState<TenantMcpServer[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [serverList, agentList] = await Promise.all([
      api.tenantMcp.listServers(),
      api.agents.list(),
    ]);
    setServers(serverList);
    setAgents(agentList.filter((a) => a.isActive));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const parseArgs = (raw: string): string[] =>
    raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

  const parseEnv = (raw: string): Record<string, string> => {
    const env: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx <= 0) continue;
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
    return env;
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError(null);
  };

  const startEdit = (server: TenantMcpServer) => {
    setEditingId(server.id);
    setForm({
      name: server.name,
      command: server.command ?? "",
      argsJson: server.argsJson ? JSON.parse(server.argsJson).join("\n") : "",
      envJson: "",
      description: server.description ?? "",
      readOnly: server.readOnly,
      maxCallsPerRun: server.maxCallsPerRun,
      enabled: server.enabled,
      agentIds: server.agentIds,
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        command: form.command.trim(),
        description: form.description.trim() || null,
        argsJson: parseArgs(form.argsJson),
        env: form.envJson.trim() ? parseEnv(form.envJson) : undefined,
        readOnly: form.readOnly,
        maxCallsPerRun: form.maxCallsPerRun,
        enabled: form.enabled,
        agentIds: form.agentIds,
      };

      if (editingId) {
        await api.tenantMcp.updateServer(editingId, payload);
      } else {
        await api.tenantMcp.createServer(payload);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(t("settings.mcp.deleteConfirm"))) return;
    await api.tenantMcp.deleteServer(id);
    if (editingId === id) resetForm();
    await load();
  };

  const sync = async (id: string) => {
    setSyncingId(id);
    setValidationMessage(null);
    try {
      await api.tenantMcp.syncServer(id);
      await load();
    } finally {
      setSyncingId(null);
    }
  };

  const validateLlm = async (id: string) => {
    setValidatingId(id);
    setValidationMessage(null);
    try {
      const result = await api.tenantMcp.validateLlm(id);
      if (result.ok) {
        setValidationMessage(
          t("settings.mcp.validateOk", {
            provider: result.provider,
            model: result.model,
            count: result.toolCount,
          }),
        );
      } else {
        setValidationMessage(
          [result.error, result.responseBody].filter(Boolean).join("\n\n") ||
            t("settings.mcp.validateFailed"),
        );
      }
    } catch (err) {
      setValidationMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setValidatingId(null);
    }
  };

  const toggleAgent = (agentId: string) => {
    setForm((prev) => ({
      ...prev,
      agentIds: prev.agentIds.includes(agentId)
        ? prev.agentIds.filter((id) => id !== agentId)
        : [...prev.agentIds, agentId],
    }));
  };

  if (loading) {
    return <p className="text-sm text-[var(--color-muted-foreground)]">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("settings.mcp.title")}</h2>
        <p className="text-sm text-[var(--color-muted-foreground)]">{t("settings.mcp.subtitle")}</p>
        <ul className="list-disc space-y-1 pl-5 text-xs text-[var(--color-muted-foreground)]">
          <li>{t("settings.mcp.guardrailReadOnly")}</li>
          <li>{t("settings.mcp.guardrailGrants")}</li>
          <li>{t("settings.mcp.guardrailQuota")}</li>
        </ul>
      </section>

      {validationMessage && (
        <pre className="max-h-48 overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-xs whitespace-pre-wrap">
          {validationMessage}
        </pre>
      )}

      {servers.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">{t("settings.mcp.registered")}</h3>
          {servers.map((server) => (
            <article
              key={server.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {server.name}{" "}
                    <span className="text-xs text-[var(--color-muted-foreground)]">({server.slug})</span>
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">{server.command}</p>
                  <p className="mt-1 text-xs">
                    {server.enabled ? t("settings.mcp.enabled") : t("settings.mcp.disabled")} ·{" "}
                    {server.readOnly ? t("settings.mcp.readOnlyOn") : t("settings.mcp.readOnlyOff")} ·{" "}
                    {t("settings.mcp.toolsCount", { count: server.tools.length })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(server)}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-1 text-xs"
                  >
                    {t("common.edit")}
                  </button>
                  <button
                    type="button"
                    disabled={syncingId === server.id}
                    onClick={() => void sync(server.id)}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-1 text-xs disabled:opacity-50"
                  >
                    {syncingId === server.id ? t("common.loading") : t("settings.mcp.sync")}
                  </button>
                  <button
                    type="button"
                    disabled={validatingId === server.id || server.tools.length === 0}
                    onClick={() => void validateLlm(server.id)}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-1 text-xs disabled:opacity-50"
                  >
                    {validatingId === server.id ? t("common.loading") : t("settings.mcp.validateLlm")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(server.id)}
                    className="rounded-lg border border-[var(--color-destructive)]/40 px-3 py-1 text-xs text-[var(--color-destructive)]"
                  >
                    {t("common.delete")}
                  </button>
                </div>
              </div>
              {server.tools.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1">
                  {server.tools.map((tool) => (
                    <li
                      key={tool.id}
                      className="rounded-md bg-[var(--color-muted)]/30 px-2 py-0.5 text-xs"
                      title={tool.description ?? undefined}
                    >
                      {tool.name}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </section>
      )}

      <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <h3 className="text-sm font-semibold">
          {editingId ? t("settings.mcp.editServer") : t("settings.mcp.addServer")}
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span>{t("settings.mcp.name")}</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>{t("settings.mcp.maxCalls")}</span>
            <input
              type="number"
              min={1}
              max={200}
              value={form.maxCallsPerRun}
              onChange={(e) => setForm({ ...form, maxCallsPerRun: Number(e.target.value) || 30 })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            />
          </label>
          <label className="block space-y-1 text-sm md:col-span-2">
            <span>{t("settings.mcp.command")}</span>
            <input
              value={form.command}
              onChange={(e) => setForm({ ...form, command: e.target.value })}
              placeholder="npx"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 font-mono text-xs"
            />
          </label>
          <label className="block space-y-1 text-sm md:col-span-2">
            <span>{t("settings.mcp.args")}</span>
            <textarea
              value={form.argsJson}
              onChange={(e) => setForm({ ...form, argsJson: e.target.value })}
              placeholder="-y&#10;@modelcontextprotocol/server-filesystem&#10;/path"
              rows={3}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 font-mono text-xs"
            />
          </label>
          <label className="block space-y-1 text-sm md:col-span-2">
            <span>{t("settings.mcp.env")}</span>
            <textarea
              value={form.envJson}
              onChange={(e) => setForm({ ...form, envJson: e.target.value })}
              placeholder="API_KEY=secret"
              rows={2}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 font-mono text-xs"
            />
            <span className="text-xs text-[var(--color-muted-foreground)]">{t("settings.mcp.envHint")}</span>
          </label>
          <label className="block space-y-1 text-sm md:col-span-2">
            <span>{t("settings.mcp.description")}</span>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            {t("settings.mcp.enabled")}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.readOnly}
              onChange={(e) => setForm({ ...form, readOnly: e.target.checked })}
            />
            {t("settings.mcp.readOnlyOn")}
          </label>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t("settings.mcp.agentGrants")}</legend>
          <div className="flex flex-wrap gap-2">
            {agents.map((agent) => (
              <label key={agent.id} className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs">
                <input
                  type="checkbox"
                  checked={form.agentIds.includes(agent.id)}
                  onChange={() => toggleAgent(agent.id)}
                />
                {agent.name}
              </label>
            ))}
          </div>
        </fieldset>

        {error && <p className="text-sm text-[var(--color-destructive)]">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <button
            disabled={saving || !form.name.trim() || !form.command.trim()}
            onClick={() => void save()}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
          >
            {saving ? t("common.saving") : editingId ? t("settings.mcp.update") : t("settings.mcp.create")}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm"
            >
              {t("common.cancel")}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
