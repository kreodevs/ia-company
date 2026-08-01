import { useTranslation } from "react-i18next";
import { resolveRunScopeMeta, type RunScopeMeta } from "../../lib/run-scope";

interface RunScopeBadgeProps {
  sharedMemory?: unknown;
  workflowName?: string | null;
  /** When API already resolved scope (encargos). */
  scope?: Pick<RunScopeMeta, "level" | "labelKey"> | null;
  className?: string;
}

const levelClass: Record<string, string> = {
  company: "border-violet-300/60 bg-violet-50 text-violet-900 dark:border-violet-800/50 dark:bg-violet-950/40 dark:text-violet-100",
  product: "border-sky-300/60 bg-sky-50 text-sky-900 dark:border-sky-800/50 dark:bg-sky-950/40 dark:text-sky-100",
  department: "border-emerald-300/60 bg-emerald-50 text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-100",
};

export default function RunScopeBadge({
  sharedMemory,
  workflowName,
  scope: scopeProp,
  className = "",
}: RunScopeBadgeProps) {
  const { t } = useTranslation();
  const scope =
    scopeProp ??
    resolveRunScopeMeta(sharedMemory, workflowName);
  if (!scope) return null;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${levelClass[scope.level] ?? levelClass.product} ${className}`}
    >
      {t(scope.labelKey)}
    </span>
  );
}
