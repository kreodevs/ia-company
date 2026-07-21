import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type LoginMode = "superadmin" | "tenant";

export default function LoginPage() {
  const { loginSuperAdmin, loginTenant } = useAuth();
  const navigate = useNavigate();
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
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-8">
        <div className="mb-6 flex rounded-lg border border-[var(--color-border)] p-1">
          {(["tenant", "superadmin"] as LoginMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-md px-3 py-2 text-sm capitalize transition ${
                mode === m
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                  : "text-[var(--color-muted-foreground)]"
              }`}
            >
              {m === "tenant" ? "Organization" : "Superadmin"}
            </button>
          ))}
        </div>

        <h1 className="text-2xl font-bold">
          {mode === "tenant" ? "Organization Login" : "Superadmin Login"}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
          {mode === "tenant"
            ? "Sign in with your organization slug and credentials."
            : "Platform administration and tenant impersonation."}
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-[var(--color-destructive)]/15 px-3 py-2 text-sm text-[var(--color-destructive)]">
            {error}
          </p>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
          {mode === "tenant" && (
            <label className="block text-sm">
              Organization slug
              <input
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                placeholder="acme-corp"
                required
              />
            </label>
          )}
          <label className="block text-sm">
            Email
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            Password
            <input
              type="password"
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
            {loading ? "Signing in…" : "Sign in"}
          </button>
          {mode === "tenant" && (
            <p className="text-center text-sm">
              <Link to="/forgot-password" className="text-[var(--color-primary)] hover:underline">
                Forgot password?
              </Link>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
