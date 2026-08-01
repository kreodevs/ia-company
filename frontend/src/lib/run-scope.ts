const SCOPE_CONTRACT_KEY = "_scopeContract";

const COMPANY_SCOPED_WORKFLOWS = new Set([
  "opportunity-discovery",
  "new-product-evaluation",
  "weekly-review",
  "research-drilldown",
]);

export interface RunScopeMeta {
  level: "company" | "product" | "department";
  intent?: string;
  labelKey: string;
}

function parseScopeContract(memory: Record<string, unknown>) {
  const raw = memory[SCOPE_CONTRACT_KEY];
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const level = o.level;
  const intent = o.intent;
  if (level !== "company" && level !== "product" && level !== "department") return null;
  return { level, intent: typeof intent === "string" ? intent : undefined };
}

export function resolveRunScopeMeta(
  sharedMemory: unknown,
  workflowName?: string | null,
): RunScopeMeta | null {
  if (!sharedMemory || typeof sharedMemory !== "object" || Array.isArray(sharedMemory)) {
    return workflowName && COMPANY_SCOPED_WORKFLOWS.has(workflowName)
      ? { level: "company", intent: "discovery", labelKey: "runs.scope.companyDiscovery" }
      : null;
  }
  const memory = sharedMemory as Record<string, unknown>;
  const scope = parseScopeContract(memory);
  if (scope) {
    if (scope.level === "company") {
      const labelKey =
        scope.intent === "review"
          ? "runs.scope.companyReview"
          : scope.intent === "discovery"
            ? "runs.scope.companyDiscovery"
            : "runs.scope.companyOperate";
      return { level: "company", intent: scope.intent, labelKey };
    }
    if (scope.level === "department") {
      return { level: "department", intent: scope.intent, labelKey: "runs.scope.department" };
    }
    return { level: "product", intent: scope.intent, labelKey: "runs.scope.product" };
  }
  if (workflowName && COMPANY_SCOPED_WORKFLOWS.has(workflowName)) {
    return { level: "company", intent: "discovery", labelKey: "runs.scope.companyDiscovery" };
  }
  if (typeof memory.productId === "string" || typeof memory.focusProductSlug === "string") {
    return { level: "product", intent: "operate", labelKey: "runs.scope.product" };
  }
  return null;
}
