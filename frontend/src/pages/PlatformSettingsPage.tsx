import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type PlatformSettings } from "../lib/api";

export default function PlatformSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setSettings(await api.admin.platformSettings.get());
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.admin.platformSettings.update(settings);
      setSettings(updated);
      setMessage("Platform settings saved");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return <p className="text-[var(--color-muted-foreground)]">Loading platform settings…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link to="/admin" className="text-sm text-[var(--color-muted-foreground)] hover:underline">
          ← Admin
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Platform Settings</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Application configuration (LLM keys, email, limits). Infrastructure secrets stay in{" "}
          <code>.env</code>.
        </p>
      </div>

      {message && (
        <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-2 text-sm">
          {message}
        </p>
      )}

      <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
        <h2 className="font-semibold">General</h2>
        <label className="block text-sm">
          Public URL
          <input
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            value={settings.publicUrl}
            onChange={(e) => setSettings({ ...settings, publicUrl: e.target.value })}
            placeholder="https://app.example.com"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            Auth rate limit / min
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              value={settings.authRateLimitMax}
              onChange={(e) =>
                setSettings({ ...settings, authRateLimitMax: Number(e.target.value) })
              }
            />
          </label>
          <label className="block text-sm">
            Execute rate limit / min
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              value={settings.executeRateLimitMax}
              onChange={(e) =>
                setSettings({ ...settings, executeRateLimitMax: Number(e.target.value) })
              }
            />
          </label>
          <label className="block text-sm">
            Shell timeout (ms)
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              value={settings.shellTimeoutMs}
              onChange={(e) =>
                setSettings({ ...settings, shellTimeoutMs: Number(e.target.value) })
              }
            />
          </label>
          <label className="block text-sm">
            Scheduler tick (ms)
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              value={settings.schedulerTickMs}
              onChange={(e) =>
                setSettings({ ...settings, schedulerTickMs: Number(e.target.value) })
              }
            />
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
        <h2 className="font-semibold">Default LLM (platform templates & fallback)</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            Provider
            <select
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              value={settings.defaultProvider}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  defaultProvider: e.target.value as PlatformSettings["defaultProvider"],
                })
              }
            >
              <option value="tokenlab">TokenLab</option>
              <option value="openrouter">OpenRouter</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            Default model
            <input
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              value={settings.defaultModel}
              onChange={(e) => setSettings({ ...settings, defaultModel: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Temperature
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              value={settings.defaultTemperature}
              onChange={(e) =>
                setSettings({ ...settings, defaultTemperature: Number(e.target.value) })
              }
            />
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 rounded-lg border border-[var(--color-border)] p-4">
            <h3 className="text-sm font-medium">TokenLab / LemonData</h3>
            <input
              type="password"
              placeholder="API key"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              value={settings.tokenlabApiKey ?? ""}
              onChange={(e) => setSettings({ ...settings, tokenlabApiKey: e.target.value })}
            />
            <input
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              value={settings.tokenlabBaseUrl}
              onChange={(e) => setSettings({ ...settings, tokenlabBaseUrl: e.target.value })}
            />
          </div>
          <div className="space-y-2 rounded-lg border border-[var(--color-border)] p-4">
            <h3 className="text-sm font-medium">OpenRouter</h3>
            <input
              type="password"
              placeholder="API key"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              value={settings.openrouterApiKey ?? ""}
              onChange={(e) => setSettings({ ...settings, openrouterApiKey: e.target.value })}
            />
            <input
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              value={settings.openrouterBaseUrl}
              onChange={(e) => setSettings({ ...settings, openrouterBaseUrl: e.target.value })}
            />
            <input
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              placeholder="HTTP-Referer"
              value={settings.openrouterReferer}
              onChange={(e) => setSettings({ ...settings, openrouterReferer: e.target.value })}
            />
          </div>
          <div className="space-y-2 rounded-lg border border-[var(--color-border)] p-4 lg:col-span-2">
            <h3 className="text-sm font-medium">Custom (OpenAI-compatible)</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="password"
                placeholder="API key"
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                value={settings.customApiKey ?? ""}
                onChange={(e) => setSettings({ ...settings, customApiKey: e.target.value })}
              />
              <input
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                placeholder="Base URL"
                value={settings.customBaseUrl}
                onChange={(e) => setSettings({ ...settings, customBaseUrl: e.target.value })}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
        <h2 className="font-semibold">Email (Resend)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            Resend API key
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              value={settings.resendApiKey ?? ""}
              onChange={(e) => setSettings({ ...settings, resendApiKey: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            From address
            <input
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              value={settings.emailFrom}
              onChange={(e) => setSettings({ ...settings, emailFrom: e.target.value })}
              placeholder="Auto Company <noreply@yourdomain.com>"
            />
          </label>
        </div>
      </section>

      <button
        disabled={saving}
        onClick={() => void save()}
        className="rounded-lg bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save platform settings"}
      </button>
    </div>
  );
}
