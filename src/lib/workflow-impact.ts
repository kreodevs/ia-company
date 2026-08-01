import { prisma } from "./prisma.js";
import { OFFICE_SERVICES } from "./office-coordinator.js";
import { ORCHESTRATION_PRESETS } from "./orchestration-presets.js";
import { PRODUCT_WORK_PRESETS } from "./product-work-presets.js";
import {
  readLinkedWorkflowIds,
  readVirtualDepartmentSlugFromWorkflow,
} from "./office-procedures.js";

export interface WorkflowImpactReference {
  kind: "schedule" | "org_unit" | "department" | "office_service" | "product_preset" | "orchestration_preset";
  id?: string;
  name: string;
  detail?: string;
}

export type WorkflowImpactSeverity = "high" | "medium" | "low";

export interface WorkflowImpactRisk {
  severity: WorkflowImpactSeverity;
  code: string;
  message: string;
}

export interface WorkflowImpactReport {
  workflowId: string;
  workflowName: string;
  references: WorkflowImpactReference[];
  risks: WorkflowImpactRisk[];
  activeRunCount: number;
  referenceCount: number;
}

export interface WorkflowImpactChangeHints {
  proposedName?: string;
  previousStepCount?: number;
  proposedStepCount?: number;
  removedAgentNames?: string[];
}

const ACTIVE_RUN_STATUSES = ["PENDING", "RUNNING", "DELEGATED", "AWAITING_USER"] as const;

export async function loadWorkflowImpactReferences(
  tenantId: string,
  workflowId: string,
): Promise<{ workflowName: string; references: WorkflowImpactReference[]; activeRunCount: number }> {
  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, tenantId },
    select: { id: true, name: true, description: true },
  });
  if (!workflow) {
    throw new Error("Workflow not found.");
  }

  const [schedules, orgUnits, activeRunCount] = await Promise.all([
    prisma.autonomousSchedule.findMany({
      where: { tenantId, workflowId },
      select: { id: true, name: true, enabled: true },
      orderBy: { name: "asc" },
    }),
    prisma.orgUnit.findMany({
      where: { tenantId },
      select: { id: true, name: true, config: true },
      orderBy: { name: "asc" },
    }),
    prisma.executionRun.count({
      where: { tenantId, workflowId, status: { in: [...ACTIVE_RUN_STATUSES] } },
    }),
  ]);

  const references: WorkflowImpactReference[] = [];

  for (const schedule of schedules) {
    references.push({
      kind: "schedule",
      id: schedule.id,
      name: schedule.name,
      detail: schedule.enabled ? "enabled" : "paused",
    });
  }

  for (const org of orgUnits) {
    const linked = readLinkedWorkflowIds(org);
    if (linked.includes(workflowId)) {
      references.push({
        kind: "org_unit",
        id: org.id,
        name: org.name,
        detail: "linked_procedure",
      });
    }
  }

  const deptSlug = readVirtualDepartmentSlugFromWorkflow(workflow.description ?? "");
  if (deptSlug) {
    references.push({
      kind: "department",
      name: deptSlug,
      detail: "virtual_department_tag",
    });
  }

  for (const service of OFFICE_SERVICES) {
    if (service.workflowName === workflow.name) {
      references.push({
        kind: "office_service",
        id: service.id,
        name: service.id,
        detail: service.workflowName,
      });
    }
  }

  for (const preset of PRODUCT_WORK_PRESETS) {
    if (preset.workflowName === workflow.name) {
      references.push({
        kind: "product_preset",
        id: preset.id,
        name: preset.id,
        detail: preset.workflowName,
      });
    }
  }

  for (const preset of Object.values(ORCHESTRATION_PRESETS)) {
    for (const rule of preset.rules) {
      if (rule.workflowName === workflow.name) {
        references.push({
          kind: "orchestration_preset",
          id: preset.id,
          name: rule.name,
          detail: preset.id,
        });
      }
    }
  }

  return { workflowName: workflow.name, references, activeRunCount };
}

export function buildWorkflowImpactRisks(
  report: Pick<WorkflowImpactReport, "references" | "activeRunCount" | "workflowName">,
  changes?: WorkflowImpactChangeHints,
): WorkflowImpactRisk[] {
  const risks: WorkflowImpactRisk[] = [];
  const refCount = report.references.length;

  if (report.activeRunCount > 0) {
    risks.push({
      severity: "high",
      code: "active_runs",
      message: `${report.activeRunCount} encargo(s) activo(s) usan este procedimiento. Espera a que terminen antes de cambiar la estructura.`,
    });
  }

  const proposedName = changes?.proposedName?.trim();
  if (proposedName && proposedName !== report.workflowName) {
    const nameBasedRefs = report.references.filter((ref) =>
      ["office_service", "product_preset", "orchestration_preset"].includes(ref.kind),
    );
    risks.push({
      severity: nameBasedRefs.length ? "high" : "medium",
      code: "rename_breaks_name_lookup",
      message:
        nameBasedRefs.length > 0
          ? `Renombrar a "${proposedName}" puede romper ${nameBasedRefs.length} referencia(s) del coordinador, productos u operaciones que buscan el slug "${report.workflowName}".`
          : `Renombrar a "${proposedName}" cambiará cómo lo invocas en briefs y programaciones.`,
    });
  }

  if (refCount > 0) {
    risks.push({
      severity: report.activeRunCount > 0 ? "high" : "medium",
      code: "shared_procedure_behavior_change",
      message: `Este procedimiento está referenciado en ${refCount} sitio(s). No se borran otros flujos, pero esas rutas ejecutarán la versión enriquecida.`,
    });
  }

  const prev = changes?.previousStepCount;
  const next = changes?.proposedStepCount;
  if (typeof prev === "number" && typeof next === "number" && prev > 0 && next < prev) {
    const removed = prev - next;
    if (removed >= 2 || next / prev <= 0.6) {
      risks.push({
        severity: "medium",
        code: "major_structure_shrink",
        message: `La propuesta reduce los pasos de ${prev} a ${next}. Encargos futuros omitirán etapas que antes existían.`,
      });
    }
  }

  if (changes?.removedAgentNames?.length) {
    risks.push({
      severity: "low",
      code: "agents_removed",
      message: `Se quitarían agentes del flujo: ${changes.removedAgentNames.join(", ")}.`,
    });
  }

  if (refCount === 0 && report.activeRunCount === 0) {
    risks.push({
      severity: "low",
      code: "isolated_procedure",
      message: "Ningún otro flujo depende de este procedimiento. Puedes enriquecerlo con bajo riesgo colateral.",
    });
  }

  return risks;
}

export async function analyzeWorkflowImpact(
  tenantId: string,
  workflowId: string,
  changes?: WorkflowImpactChangeHints,
): Promise<WorkflowImpactReport> {
  const { workflowName, references, activeRunCount } = await loadWorkflowImpactReferences(
    tenantId,
    workflowId,
  );

  const base: WorkflowImpactReport = {
    workflowId,
    workflowName,
    references,
    activeRunCount,
    referenceCount: references.length,
    risks: [],
  };

  base.risks = buildWorkflowImpactRisks(base, changes);
  return base;
}

export function diffRemovedAgentNames(
  previousSteps: Array<{ agentName: string }>,
  proposedSteps: Array<{ agentName: string }>,
): string[] {
  const next = new Set(proposedSteps.map((step) => step.agentName));
  return [...new Set(previousSteps.map((step) => step.agentName).filter((name) => !next.has(name)))];
}
