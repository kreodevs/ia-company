import { WORKFLOW_NAMES } from "./workflow-names.js";

export type ScopeLevel = "company" | "product" | "department";
export type ScopeIntent = "discovery" | "operate" | "deliver" | "review";

export interface ScopeContract {
  level: ScopeLevel;
  intent: ScopeIntent;
  productId?: string;
  productSlug?: string;
  orgUnitId?: string;
}

export const SCOPE_CONTRACT_KEY = "_scopeContract";

const COMPANY_SCOPED_WORKFLOWS = new Set<string>([
  WORKFLOW_NAMES.OPPORTUNITY_DISCOVERY,
  WORKFLOW_NAMES.NEW_PRODUCT_EVALUATION,
  WORKFLOW_NAMES.WEEKLY_REVIEW,
  WORKFLOW_NAMES.RESEARCH_DRILLDOWN,
]);

export function isCompanyScopedWorkflow(workflowName?: string | null): boolean {
  if (!workflowName) return false;
  return COMPANY_SCOPED_WORKFLOWS.has(workflowName);
}

export function buildProductScopeContract(input: {
  productId: string;
  productSlug?: string;
  orgUnitId?: string | null;
  intent?: ScopeIntent;
}): ScopeContract {
  return {
    level: input.orgUnitId ? "department" : "product",
    intent: input.intent ?? "operate",
    productId: input.productId,
    productSlug: input.productSlug,
    orgUnitId: input.orgUnitId ?? undefined,
  };
}

export function buildCompanyScopeContract(intent: ScopeIntent = "discovery"): ScopeContract {
  return { level: "company", intent };
}

export function parseScopeContract(memory: Record<string, unknown>): ScopeContract | null {
  const raw = memory[SCOPE_CONTRACT_KEY];
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const level = o.level;
  const intent = o.intent;
  if (level !== "company" && level !== "product" && level !== "department") return null;
  if (intent !== "discovery" && intent !== "operate" && intent !== "deliver" && intent !== "review") {
    return null;
  }
  return {
    level,
    intent,
    productId: typeof o.productId === "string" ? o.productId : undefined,
    productSlug: typeof o.productSlug === "string" ? o.productSlug : undefined,
    orgUnitId: typeof o.orgUnitId === "string" ? o.orgUnitId : undefined,
  };
}

export function attachScopeContract(
  memory: Record<string, unknown>,
  contract: ScopeContract,
): Record<string, unknown> {
  return { ...memory, [SCOPE_CONTRACT_KEY]: contract };
}

/** Company-scoped runs must not load product consensus into memory. */
export function shouldMergeProductConsensus(input: {
  workflowName?: string | null;
  scope?: ScopeContract | null;
  productId?: string | null;
}): boolean {
  if (!input.productId) return false;
  if (input.scope?.level === "company") return false;
  if (isCompanyScopedWorkflow(input.workflowName)) return false;
  return true;
}

export function shouldMergeTenantConsensus(input: {
  scope?: ScopeContract | null;
  productId?: string | null;
}): boolean {
  if (input.scope?.level === "product" || input.scope?.level === "department") {
    return false;
  }
  if (input.productId && input.scope?.level !== "company") {
    return false;
  }
  return true;
}

/** Company-scoped scheduled runs use tenant workspace — not the cycle focus product. */
export function shouldAttachFocusProductForScheduledRun(workflowName: string): boolean {
  return !isCompanyScopedWorkflow(workflowName);
}

export interface RunScopeMeta {
  level: ScopeLevel;
  intent: ScopeIntent;
  /** i18n key under runs.scope.* */
  labelKey: string;
}

export function resolveRunScopeMeta(
  memory: Record<string, unknown>,
  workflowName?: string | null,
): RunScopeMeta | null {
  const scope = parseScopeContract(memory);
  if (scope) {
    if (scope.level === "company") {
      const intent = scope.intent;
      const labelKey =
        intent === "discovery"
          ? "runs.scope.companyDiscovery"
          : intent === "review"
            ? "runs.scope.companyReview"
            : "runs.scope.companyOperate";
      return { level: "company", intent, labelKey };
    }
    if (scope.level === "department") {
      return { level: "department", intent: scope.intent, labelKey: "runs.scope.department" };
    }
    return { level: "product", intent: scope.intent, labelKey: "runs.scope.product" };
  }
  if (workflowName && isCompanyScopedWorkflow(workflowName)) {
    return {
      level: "company",
      intent: "discovery",
      labelKey: "runs.scope.companyDiscovery",
    };
  }
  if (typeof memory.productId === "string" || typeof memory.focusProductSlug === "string") {
    return { level: "product", intent: "operate", labelKey: "runs.scope.product" };
  }
  return null;
}

export function isCompanyScopedMemory(memory: Record<string, unknown>): boolean {
  return parseScopeContract(memory)?.level === "company";
}
