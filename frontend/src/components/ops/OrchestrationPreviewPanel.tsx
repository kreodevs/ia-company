import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type OrchestrationPreviewEntry } from "../../lib/api";
import { formatWorkflowTitle } from "../../lib/workflow-display";
import Panel from "../ui/Panel";

function workflowLabel(name: string | null, t: (key: string, options?: Record<string, unknown>) => string) {
  if (!name) return t("ops.schedules.dynamicWorkflow");
  const translated = t(`workflowDisplay.titles.${name}`, { defaultValue: "" });
  return translated || formatWorkflowTitle(name);
}

export default function OrchestrationPreviewPanel() {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<OrchestrationPreviewEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api.ops
      .orchestrationPreview(7)
      .then((result) => setPreview(result.preview))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Panel title={t("ops.orchestrationPreview.title")} subtitle={t("ops.orchestrationPreview.subtitle")} bodySize="sm">
      {loading ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">{t("ops.loading")}</p>
      ) : preview.length === 0 ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">{t("ops.orchestrationPreview.empty")}</p>
      ) : (
        <ul className="divide-y divide-[var(--color-border)]">
          {preview.map((entry) => (
            <li key={`${entry.scheduleId}-${entry.runAt}`} className="py-2 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{entry.scheduleName}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {workflowLabel(entry.workflowName, t)} ·{" "}
                    {entry.orchestrationMode === "meta_dynamic"
                      ? t("settings.orchestration.modeDynamic")
                      : t("settings.orchestration.modeFixed")}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <p>{new Date(entry.runAt).toLocaleString()}</p>
                  <p
                    className={
                      entry.conditionsMet
                        ? "text-[var(--color-primary)]"
                        : "text-[var(--color-muted-foreground)]"
                    }
                  >
                    {entry.conditionsMet
                      ? t("ops.orchestrationPreview.willRun")
                      : t("ops.orchestrationPreview.skipped", { reason: entry.skippedReason ?? "" })}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
