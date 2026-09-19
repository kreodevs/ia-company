import {
  OFFICE_SERVICES,
  type OfficeServiceTemplate,
} from "./office-coordinator.js";
import { formatProcedureLabel } from "./office-procedures.js";
import type { WorkflowName } from "./workflow-names.js";
import { prisma } from "./prisma.js";

/** Default quick-start playbooks (3) per virtual department — Oleada 5.6 */
export const DEFAULT_DEPARTMENT_PLAYBOOK_SERVICE_IDS: Record<string, string[]> = {
  strategy: ["market-scan", "idea-validation", "weekly-review"],
  product: ["feature-sprint", "product-launch", "idea-validation"],
  engineering: ["repo-analysis", "feature-sprint", "seo-audit"],
  business: ["pricing-review", "marketing-sprint", "weekly-review"],
};

export interface DepartmentPlaybookSummary {
  serviceId: string;
  labelKey: string;
  descKey: string;
  emoji: string;
  deliverableKey: string;
  workflowName: string | null;
  procedureLabel: string | null;
  stepCount: number | null;
  estimatedCostUsd: { min: number; max: number };
  estimatedMinutes: { min: number; max: number };
  examplePromptKey: string;
}

function estimateForService(service: OfficeServiceTemplate, agentCount: number) {
  const count = Math.max(1, agentCount);
  return {
    estimatedCostUsd: {
      min: Math.round(count * service.costPerAgentUsd * 0.75 * 100) / 100,
      max: Math.round(count * service.costPerAgentUsd * 1.35 * 100) / 100,
    },
    estimatedMinutes: {
      min: count * Math.max(3, service.minutesPerAgent - 2),
      max: count * (service.minutesPerAgent + 3),
    },
  };
}

async function stepCountForWorkflowName(
  tenantId: string,
  workflowName: WorkflowName | string | undefined,
): Promise<number | null> {
  if (!workflowName) return null;
  const workflow = await prisma.workflow.findFirst({
    where: { tenantId, name: workflowName },
    include: { _count: { select: { steps: true } } },
  });
  return workflow?._count.steps ?? null;
}

export async function listDefaultPlaybooksForDepartment(
  tenantId: string,
  departmentSlug: string,
): Promise<DepartmentPlaybookSummary[]> {
  const serviceIds = DEFAULT_DEPARTMENT_PLAYBOOK_SERVICE_IDS[departmentSlug] ?? [];
  const items: DepartmentPlaybookSummary[] = [];

  for (const serviceId of serviceIds) {
    const service = OFFICE_SERVICES.find((entry) => entry.id === serviceId);
    if (!service) continue;
    const agentCount = service.agentNames.length;
    const workflowName = service.workflowName ?? null;
    const stepCount = workflowName
      ? await stepCountForWorkflowName(tenantId, workflowName)
      : agentCount;
    items.push({
      serviceId: service.id,
      labelKey: service.labelKey,
      descKey: service.descKey,
      emoji: service.emoji,
      deliverableKey: service.deliverableKey,
      workflowName,
      procedureLabel: workflowName ? formatProcedureLabel(workflowName) : null,
      stepCount,
      examplePromptKey: service.examplePromptKey,
      ...estimateForService(service, agentCount),
    });
  }

  return items;
}

export function serviceTemplateById(serviceId: string): OfficeServiceTemplate | undefined {
  return OFFICE_SERVICES.find((entry) => entry.id === serviceId);
}

/** Workflow names referenced by default department playbooks (for tests). */
export const DEPARTMENT_PLAYBOOK_WORKFLOW_NAMES = [
  ...new Set(
    Object.values(DEFAULT_DEPARTMENT_PLAYBOOK_SERVICE_IDS)
      .flat()
      .map((id) => OFFICE_SERVICES.find((s) => s.id === id)?.workflowName)
      .filter((name): name is WorkflowName => Boolean(name)),
  ),
];
