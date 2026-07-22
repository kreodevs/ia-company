import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { translateApiError } from "../lib/translate-error";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

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
        <Link to="/forgot-password" className="interactive text-[var(--color-primary)] hover:underline">
          {t("auth.resetPassword.requestNewLink")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-md flex-col justify-center px-1 sm:px-4">
      <Card className="shadow-lg shadow-black/20">
        <h1 className="text-xl font-bold sm:text-2xl">{t("auth.resetPassword.title")}</h1>
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
          <Input
            label={t("auth.resetPassword.newPasswordPlaceholder")}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <Input
            label={t("auth.resetPassword.confirmPasswordPlaceholder")}
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <Button type="submit" disabled={loading} fullWidthMobile className="w-full">
            {loading ? t("common.saving") : t("auth.resetPassword.updatePassword")}
          </Button>
        </form>
        {error && (
          <p className="mt-4 rounded-lg bg-[var(--color-destructive)]/15 px-3 py-2.5 text-sm text-[var(--color-destructive)]" role="alert">
            {error}
          </p>
        )}
      </Card>
    </div>
  );
}
