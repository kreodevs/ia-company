import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

export default function ForgotPasswordPage() {
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
      setMessage(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-8">
        <h1 className="text-xl font-bold">Reset password</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Enter your organization slug and email. We will send a reset link if the account exists.
        </p>
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
          <input
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
            placeholder="Organization slug"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            required
          />
          <input
            type="email"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--color-primary)] py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
        {message && <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">{message}</p>}
        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="text-[var(--color-primary)] hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
