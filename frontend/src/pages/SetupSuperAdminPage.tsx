import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { translateApiError } from "../lib/translate-error";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

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
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-md flex-col justify-center px-1 sm:px-4">
      <Card className="shadow-lg shadow-black/20">
        <h1 className="text-xl font-bold sm:text-2xl">{t("auth.setup.title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          {t("auth.setup.subtitle")}
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
          <Input
            label={t("common.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label={t("common.email")}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label={t("auth.setup.passwordMin")}
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" disabled={loading} fullWidthMobile className="w-full">
            {loading ? t("common.creating") : t("auth.setup.createSuperadmin")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-muted-foreground)]">
          {t("auth.setup.alreadyHaveAccount")}{" "}
          <Link to="/login" className="interactive text-[var(--color-primary)] hover:underline">
            {t("auth.login.signIn")}
          </Link>
        </p>
      </Card>
    </div>
  );
}
