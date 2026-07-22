import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { translateApiError } from "../lib/translate-error";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [tenantSlug, setTenantSlug] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.auth.forgotPassword({ tenantSlug, email });
      setMessage(res.message);
    } catch (err) {
      setMessage(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-md flex-col justify-center px-1 sm:px-4">
      <Card className="shadow-lg shadow-black/20">
        <h1 className="text-xl font-bold sm:text-2xl">{t("auth.forgotPassword.title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          {t("auth.forgotPassword.subtitle")}
        </p>
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
          <Input
            label={t("auth.login.tenantSlug")}
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            placeholder={t("auth.forgotPassword.tenantSlugPlaceholder")}
            required
          />
          <Input
            label={t("common.email")}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.forgotPassword.emailPlaceholder")}
            required
          />
          <Button type="submit" disabled={loading} fullWidthMobile className="w-full">
            {loading ? t("common.sending") : t("auth.forgotPassword.sendResetLink")}
          </Button>
        </form>
        {message && (
          <p className="mt-4 rounded-lg bg-[var(--color-muted)]/40 px-3 py-2.5 text-sm text-[var(--color-muted-foreground)]">
            {message}
          </p>
        )}
        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="interactive text-[var(--color-primary)] hover:underline">
            {t("auth.forgotPassword.backToLogin")}
          </Link>
        </p>
      </Card>
    </div>
  );
}
