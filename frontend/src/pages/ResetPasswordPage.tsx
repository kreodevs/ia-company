import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { translateApiError } from "../lib/translate-error";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError(t("auth.resetPassword.passwordsDoNotMatch"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.auth.resetPassword({ token, password });
      navigate("/login");
    } catch (err) {
      setError(translateApiError(err, t, "common.resetFailed"));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-[var(--color-muted-foreground)]">
        {t("auth.resetPassword.missingToken")}{" "}
        <Link to="/forgot-password" className="text-[var(--color-primary)] hover:underline">
          {t("auth.resetPassword.requestNewLink")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-8">
        <h1 className="text-xl font-bold">{t("auth.resetPassword.title")}</h1>
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
          <input
            type="password"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
            placeholder={t("auth.resetPassword.newPasswordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <input
            type="password"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
            placeholder={t("auth.resetPassword.confirmPasswordPlaceholder")}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--color-primary)] py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
          >
            {loading ? t("common.saving") : t("auth.resetPassword.updatePassword")}
          </button>
        </form>
        {error && <p className="mt-4 text-sm text-[var(--color-destructive)]">{error}</p>}
      </div>
    </div>
  );
}
