import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { translateApiError } from "../lib/translate-error";
import AuthPageShell from "../components/ui/AuthPageShell";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

type LoginMode = "superadmin" | "tenant";

export default function LoginPage() {
  const { loginSuperAdmin, loginTenant } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [mode, setMode] = useState<LoginMode>("tenant");
  const [tenantSlug, setTenantSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "superadmin") {
        await loginSuperAdmin(email, password);
        navigate("/admin", { replace: true });
      } else {
        await loginTenant(tenantSlug, email, password);
        navigate("/ops", { replace: true });
      }
    } catch (err) {
      setError(translateApiError(err, t, "common.loginFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell>
      <div className="auth-page-brand">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          {t("common.appName")}
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-3xl">
          {mode === "tenant" ? t("auth.login.organizationTitle") : t("auth.login.superadminTitle")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          {mode === "tenant" ? t("auth.login.organizationSubtitle") : t("auth.login.superadminSubtitle")}
        </p>
      </div>

      <Card className="auth-card">
        <div className="auth-mode-toggle mb-6">
          {(["tenant", "superadmin"] as LoginMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              aria-pressed={mode === m}
              className="auth-mode-toggle-btn interactive"
            >
              {m === "tenant" ? t("auth.login.organizationTab") : t("auth.login.superadminTab")}
            </button>
          ))}
        </div>

        {error && (
          <p
            className="mb-4 rounded-lg bg-[var(--color-destructive)]/15 px-3 py-2.5 text-sm text-[var(--color-destructive)]"
            role="alert"
          >
            {error}
          </p>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {mode === "tenant" && (
            <Input
              label={t("auth.login.tenantSlug")}
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              placeholder={t("auth.login.tenantSlugPlaceholder")}
              autoComplete="organization"
              required
            />
          )}
          <Input
            label={t("common.email")}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label={t("common.password")}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" disabled={loading} fullWidthMobile className="w-full">
            {loading ? t("auth.login.signingIn") : t("auth.login.signIn")}
          </Button>
          {mode === "tenant" && (
            <p className="text-center text-sm">
              <Link to="/forgot-password" className="interactive text-[var(--color-primary)] hover:underline">
                {t("auth.login.forgotPassword")}
              </Link>
            </p>
          )}
        </form>
      </Card>
    </AuthPageShell>
  );
}
