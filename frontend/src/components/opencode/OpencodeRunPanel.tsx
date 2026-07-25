import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import Button from "../ui/Button";
import Card from "../ui/Card";

interface OpencodeRunPanelProps {
  runId: string;
  status: string;
  onUpdated: () => void;
}

export default function OpencodeRunPanel({ runId, status, onUpdated }: OpencodeRunPanelProps) {
  const { t } = useTranslation();
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [delegation, setDelegation] = useState<Awaited<ReturnType<typeof api.opencode.getRun>> | null>(
    null,
  );

  useEffect(() => {
    if (status !== "AWAITING_USER" && status !== "DELEGATED") return;

    const load = () => {
      void api.opencode.getRun(runId).then(setDelegation).catch(() => undefined);
    };

    load();
    if (status !== "DELEGATED") return;

    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, [runId, status]);

  const resolveGate = async (decision: "proceed_local" | "cancel") => {
    setActing(true);
    setError(null);
    try {
      await api.opencode.resolveGate(runId, decision);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActing(false);
    }
  };

  const cancelDelegation = async () => {
    setActing(true);
    setError(null);
    try {
      await api.opencode.cancelDelegation(runId);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActing(false);
    }
  };

  if (status === "AWAITING_USER") {
    return (
      <Card className="border-amber-500/40 bg-amber-500/5">
        <h3 className="font-semibold">{t("opencode.gate.title")}</h3>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{t("opencode.gate.body")}</p>
        {error && <p className="mt-2 text-sm text-[var(--color-destructive)]">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={acting} onClick={() => void resolveGate("proceed_local")}>
            {t("opencode.gate.continueLocal")}
          </Button>
          <Button variant="destructive" disabled={acting} onClick={() => void resolveGate("cancel")}>
            {t("opencode.gate.cancelRun")}
          </Button>
        </div>
      </Card>
    );
  }

  if (status === "DELEGATED") {
    return (
      <Card className="border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5">
        <h3 className="font-semibold">{t("opencode.delegated.title")}</h3>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{t("opencode.delegated.body")}</p>
        {delegation?.delegation && (
          <dl className="mt-3 grid gap-2 text-sm">
            <div>
              <dt className="text-[var(--color-muted-foreground)]">{t("opencode.delegated.session")}</dt>
              <dd className="font-mono text-xs">{delegation.delegation.opencodeSessionId}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-muted-foreground)]">{t("opencode.delegated.status")}</dt>
              <dd>{delegation.delegation.status}</dd>
            </div>
          </dl>
        )}
        {error && <p className="mt-2 text-sm text-[var(--color-destructive)]">{error}</p>}
        <div className="mt-4">
          <Button variant="destructive" disabled={acting} onClick={() => void cancelDelegation()}>
            {t("opencode.delegated.cancel")}
          </Button>
        </div>
      </Card>
    );
  }

  return null;
}
