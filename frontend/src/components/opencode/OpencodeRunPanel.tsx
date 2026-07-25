import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type OpencodeRunInfo } from "../../lib/api";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Input from "../ui/Input";

interface OpencodeRunPanelProps {
  runId: string;
  status: string;
  onUpdated: () => void;
}

export default function OpencodeRunPanel({ runId, status, onUpdated }: OpencodeRunPanelProps) {
  const { t } = useTranslation();
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<OpencodeRunInfo | null>(null);
  const [agent, setAgent] = useState("");
  const [model, setModel] = useState("");
  const [projectPath, setProjectPath] = useState("");

  useEffect(() => {
    if (status !== "AWAITING_USER" && status !== "DELEGATED") return;

    const load = () => {
      void api.opencode.getRun(runId).then((data) => {
        setInfo(data);
        if (data.confirmDefaults) {
          setAgent(data.confirmDefaults.agent ?? "");
          setModel(data.confirmDefaults.model ?? "");
          setProjectPath(
            data.confirmDefaults.projectPath ?? data.confirmDefaults.suggestedProjectPath ?? "",
          );
        }
      }).catch(() => undefined);
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

  const confirmDelegate = async () => {
    setActing(true);
    setError(null);
    try {
      await api.opencode.resolveGate(runId, "proceed_opencode", {
        agent: agent.trim() || null,
        model: model.trim() || null,
        projectPath: projectPath.trim() || null,
      });
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

  if (status === "AWAITING_USER" && info?.awaitingOpencodeConfirm) {
    return (
      <Card className="border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5">
        <h3 className="font-semibold">{t("opencode.confirm.title")}</h3>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{t("opencode.confirm.body")}</p>
        {info.gate?.pendingBriefPreview && (
          <pre className="mt-3 max-h-40 overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-xs whitespace-pre-wrap">
            {info.gate.pendingBriefPreview}
          </pre>
        )}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input
            label={t("opencode.settings.defaultAgent")}
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            disabled={acting}
          />
          <Input
            label={t("opencode.settings.defaultModel")}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={acting}
          />
          <div className="md:col-span-2">
            <Input
              label={t("opencode.settings.projectPath")}
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              placeholder={info.confirmDefaults?.suggestedProjectPath}
              disabled={acting}
            />
            {info.confirmDefaults?.suggestedProjectPath && (
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                {t("opencode.productSettings.projectPathHint", {
                  path: info.confirmDefaults.suggestedProjectPath,
                })}
              </p>
            )}
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-[var(--color-destructive)]">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={acting} onClick={() => void confirmDelegate()}>
            {t("opencode.confirm.delegate")}
          </Button>
          <Button variant="secondary" disabled={acting} onClick={() => void resolveGate("proceed_local")}>
            {t("opencode.gate.continueLocal")}
          </Button>
          <Button variant="destructive" disabled={acting} onClick={() => void resolveGate("cancel")}>
            {t("opencode.gate.cancelRun")}
          </Button>
        </div>
      </Card>
    );
  }

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
        {info?.delegation && (
          <dl className="mt-3 grid gap-2 text-sm">
            <div>
              <dt className="text-[var(--color-muted-foreground)]">{t("opencode.delegated.session")}</dt>
              <dd className="font-mono text-xs">{info.delegation.opencodeSessionId}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-muted-foreground)]">{t("opencode.delegated.status")}</dt>
              <dd>{info.delegation.status}</dd>
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
