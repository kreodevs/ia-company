import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { translateApiError } from "../lib/translate-error";

export default function SetupSuperAdminPage() {
  const { setup } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await setup(email, name, password);
    } catch (err) {
      setError(translateApiError(err, t, "common.setupFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-8">
        <h1 className="text-2xl font-bold">{t("auth.setup.title")}</h1>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{t("auth.setup.subtitle")}</p>

        {error && (
          <p className="mt-4 rounded-lg bg-[var(--color-destructive)]/15 px-3 py-2 text-sm text-[var(--color-destructive)]">
            {error}
          </p>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
          <label className="block text-sm">
            {t("common.name")}
            <input
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            {t("common.email")}
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            {t("auth.setup.passwordMin")}
            <input
              type="password"
              minLength={8}
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--color-primary)] py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
          >
            {loading ? t("common.creating") : t("auth.setup.createSuperadmin")}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--color-muted-foreground)]">
          {t("auth.setup.alreadyHaveAccount")}{" "}
          <Link to="/login" className="text-[var(--color-primary)] hover:underline">
            {t("auth.login.signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
