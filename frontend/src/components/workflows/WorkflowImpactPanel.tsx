import { useTranslation } from "react-i18next";
import type { WorkflowImpactReport } from "../../lib/catalog-studio-types";

interface WorkflowImpactPanelProps {
  impact: WorkflowImpactReport;
  proposedName?: string;
  currentName?: string;
}

const severityClass: Record<string, string> = {
  high: "border-red-300 bg-red-50/80 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100",
  medium:
    "border-amber-300 bg-amber-50/80 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100",
  low: "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)]",
};

const referenceKindKey: Record<string, string> = {
  schedule: "workflows.ai.impact.refSchedule",
  org_unit: "workflows.ai.impact.refOrgUnit",
  department: "workflows.ai.impact.refDepartment",
  office_service: "workflows.ai.impact.refOfficeService",
  product_preset: "workflows.ai.impact.refProductPreset",
  orchestration_preset: "workflows.ai.impact.refOrchestrationPreset",
};

export default function WorkflowImpactPanel({
  impact,
  proposedName,
  currentName,
}: WorkflowImpactPanelProps) {
  const { t } = useTranslation();
  const renaming = Boolean(proposedName && currentName && proposedName !== currentName);

  return (
    <div className="space-y-3 rounded-md border border-[var(--color-border)] p-4">
      <div>
        <p className="text-sm font-medium">{t("workflows.ai.impact.title")}</p>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          {t("workflows.ai.impact.subtitle")}
        </p>
      </div>

      {renaming ? (
        <p className="text-xs text-amber-800 dark:text-amber-200">
          {t("workflows.ai.impact.renameNotice", { from: currentName, to: proposedName })}
        </p>
      ) : null}

      {impact.references.length ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {t("workflows.ai.impact.referencesTitle", { count: impact.referenceCount })}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {impact.references.map((ref) => (
              <li key={`${ref.kind}-${ref.id ?? ref.name}`} className="flex flex-wrap gap-1">
                <span className="font-medium">{t(referenceKindKey[ref.kind] ?? ref.kind)}:</span>
                <span>{ref.name}</span>
                {ref.detail ? (
                  <span className="text-[var(--color-muted-foreground)]">({ref.detail})</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t("workflows.ai.impact.noReferences")}
        </p>
      )}

      {impact.risks.length ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {t("workflows.ai.impact.risksTitle")}
          </p>
          {impact.risks.map((risk) => (
            <div
              key={risk.code}
              className={`rounded-md border px-3 py-2 text-sm ${severityClass[risk.severity] ?? severityClass.low}`}
            >
              {risk.message}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
