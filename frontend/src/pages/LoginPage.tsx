import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { translateApiError } from "../lib/translate-error";
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
        navigate("/workflows", { replace: true });
      }
    } catch (err) {
      setError(translateApiError(err, t, "common.loginFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-md flex-col justify-center px-1 sm:px-4">
      <Card className="shadow-lg shadow-black/20">
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-1">
          {(["tenant", "superadmin"] as LoginMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`interactive min-h-11 rounded-md px-3 py-2 text-sm font-medium transition sm:min-h-9 ${
                mode === m
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              }`}
            >
              {m === "tenant" ? t("auth.login.organizationTab") : t("auth.login.superadminTab")}
            </button>
          ))}
        </div>

        <h1 className="text-xl font-bold sm:text-2xl">
          {mode === "tenant" ? t("auth.login.organizationTitle") : t("auth.login.superadminTitle")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          {mode === "tenant" ? t("auth.login.organizationSubtitle") : t("auth.login.superadminSubtitle")}
        </p>

        {error && (
          <p
            className="mt-4 rounded-lg bg-[var(--color-destructive)]/15 px-3 py-2.5 text-sm text-[var(--color-destructive)]"
            role="alert"
          >
            {error}
          </p>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
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
    </div>
  );
}
