import type { OrgUnit, Workflow } from "@prisma/client";
import { OFFICE_SERVICES } from "./office-coordinator.js";
import {
  resolveVirtualDepartmentForAgent,
  VIRTUAL_OFFICE_DEPARTMENTS,
  type VirtualOfficeDepartmentDef,
} from "./office-departments.js";
import { suggestedAgentsFromOrgRecord } from "./org-context.js";
import { agentNamesFromWorkflowSteps } from "./office-run-department.js";
import { prisma } from "./prisma.js";

type WorkflowWithSteps = Workflow & {
  steps: Array<{ agent: { name: string } | null; stepOrder: number }>;
};

export interface OfficeProcedureSummary {
  id: string;
  name: string;
  procedureLabel: string;
  description: string | null;
  agentNames: string[];
  stepCount: number;
  departmentSlug: string | null;
  serviceId: string | null;
}

export function formatProcedureLabel(name: string): string {
  if (name.includes(" ")) return name;
  return name
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function agentNamesFromWorkflow(workflow: WorkflowWithSteps): string[] {
  return agentNamesFromWorkflowSteps(workflow.steps);
}

export function resolveWorkflowVirtualDepartment(
  agentNames: string[],
): VirtualOfficeDepartmentDef["slug"] | null {
  if (agentNames.length === 0) return null;

  const votes = new Map<string, number>();
  for (const agentName of agentNames) {
    const slug = resolveVirtualDepartmentForAgent(agentName);
    if (!slug) continue;
    votes.set(slug, (votes.get(slug) ?? 0) + 1);
  }
  if (votes.size === 0) return null;

  let bestSlug: string | null = null;
  let bestCount = 0;
  for (const [slug, count] of votes) {
    if (count > bestCount) {
      bestSlug = slug;
      bestCount = count;
    }
  }
  if (!bestSlug) return null;
  return bestCount / agentNames.length >= 0.5 ? bestSlug : null;
}

function serviceIdForWorkflowName(workflowName: string): string | null {
  const service = OFFICE_SERVICES.find((item) => item.workflowName === workflowName);
  return service?.id ?? null;
}

function mapWorkflowToProcedure(workflow: WorkflowWithSteps): OfficeProcedureSummary {
  const agentNames = agentNamesFromWorkflow(workflow);
  return {
    id: workflow.id,
    name: workflow.name,
    procedureLabel: formatProcedureLabel(workflow.name),
    description: workflow.description,
    agentNames,
    stepCount: workflow.steps.length,
    departmentSlug: resolveWorkflowVirtualDepartment(agentNames),
    serviceId: serviceIdForWorkflowName(workflow.name),
  };
}

export function groupWorkflowsByVirtualDepartment(
  workflows: WorkflowWithSteps[],
): Map<string, OfficeProcedureSummary[]> {
  const grouped = new Map<string, OfficeProcedureSummary[]>();
  for (const def of VIRTUAL_OFFICE_DEPARTMENTS) {
    grouped.set(def.slug, []);
  }
  grouped.set("unassigned", []);

  for (const workflow of workflows) {
    const procedure = mapWorkflowToProcedure(workflow);
    const bucket = procedure.departmentSlug ?? "unassigned";
    const list = grouped.get(bucket) ?? grouped.get("unassigned")!;
    list.push(procedure);
  }

  for (const list of grouped.values()) {
    list.sort((a, b) => a.procedureLabel.localeCompare(b.procedureLabel));
  }

  return grouped;
}

function readDefaultWorkflowName(org: OrgUnit & { template: { definition: unknown } | null }): string | null {
  const config = (org.config ?? {}) as Record<string, unknown>;
  const fromConfig = config.defaultWorkflow;
  if (typeof fromConfig === "string" && fromConfig.trim()) return fromConfig.trim();
  const definition = org.template?.definition as { defaultWorkflow?: string } | undefined;
  return typeof definition?.defaultWorkflow === "string" ? definition.defaultWorkflow : null;
}

function workflowMatchesOrgUnit(
  workflow: WorkflowWithSteps,
  staffAgentNames: string[],
  defaultWorkflowName: string | null,
): boolean {
  if (defaultWorkflowName && workflow.name === defaultWorkflowName) return true;
  if (staffAgentNames.length === 0) return false;
  const staff = new Set(staffAgentNames);
  const workflowAgents = agentNamesFromWorkflow(workflow);
  if (workflowAgents.length === 0) return false;
  const overlap = workflowAgents.filter((name) => staff.has(name)).length;
  return overlap / workflowAgents.length >= 0.5;
}

async function loadTenantWorkflows(tenantId: string): Promise<WorkflowWithSteps[]> {
  return prisma.workflow.findMany({
    where: { tenantId },
    include: {
      steps: {
        include: { agent: { select: { name: true } } },
        orderBy: { stepOrder: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function listProceduresForVirtualDepartment(
  tenantId: string,
  departmentSlug: string,
): Promise<{ items: OfficeProcedureSummary[] }> {
  const workflows = await loadTenantWorkflows(tenantId);
  const items = workflows
    .map(mapWorkflowToProcedure)
    .filter((procedure) => procedure.departmentSlug === departmentSlug);
  return { items };
}

export async function listProceduresForOrgUnit(
  tenantId: string,
  orgUnitId: string,
): Promise<{ items: OfficeProcedureSummary[] }> {
  const [workflows, orgUnit] = await Promise.all([
    loadTenantWorkflows(tenantId),
    prisma.orgUnit.findFirst({
      where: { id: orgUnitId, tenantId, isActive: true },
      include: { template: { select: { definition: true } } },
    }),
  ]);
  if (!orgUnit) return { items: [] };

  const staffAgentNames = suggestedAgentsFromOrgRecord(orgUnit);
  const defaultWorkflowName = readDefaultWorkflowName(orgUnit);

  const items = workflows
    .filter((workflow) => workflowMatchesOrgUnit(workflow, staffAgentNames, defaultWorkflowName))
    .map(mapWorkflowToProcedure);

  return { items };
}

export interface OfficeProcedureGroup {
  departmentSlug: string | null;
  orgUnitId: string | null;
  orgUnitName: string | null;
  items: OfficeProcedureSummary[];
}

export async function listGroupedProcedures(tenantId: string): Promise<{
  groups: OfficeProcedureGroup[];
  unassigned: OfficeProcedureSummary[];
}> {
  const [workflows, orgUnits] = await Promise.all([
    loadTenantWorkflows(tenantId),
    prisma.orgUnit.findMany({
      where: { tenantId, isActive: true },
      include: { template: { select: { definition: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const procedures = workflows.map(mapWorkflowToProcedure);
  const orgAssignedIds = new Set<string>();

  const orgGroups = orgUnits.map((org) => {
    const staffAgentNames = suggestedAgentsFromOrgRecord(org);
    const defaultWorkflowName = readDefaultWorkflowName(org);
    const items = workflows
      .filter((workflow) => {
        if (!workflowMatchesOrgUnit(workflow, staffAgentNames, defaultWorkflowName)) return false;
        orgAssignedIds.add(workflow.id);
        return true;
      })
      .map(mapWorkflowToProcedure);
    return {
      departmentSlug: null,
      orgUnitId: org.id,
      orgUnitName: org.name,
      items,
    };
  });

  const virtualGroups = VIRTUAL_OFFICE_DEPARTMENTS.map((def) => {
    const items = procedures.filter((procedure) => {
      if (procedure.departmentSlug !== def.slug) return false;
      if (orgAssignedIds.has(procedure.id)) return false;
      return true;
    });
    return {
      departmentSlug: def.slug,
      orgUnitId: null,
      orgUnitName: null,
      items,
    };
  });

  const assignedIds = new Set([...orgAssignedIds]);
  for (const group of virtualGroups) {
    for (const item of group.items) assignedIds.add(item.id);
  }

  const unassigned = procedures.filter((procedure) => !assignedIds.has(procedure.id));

  return {
    groups: [...virtualGroups, ...orgGroups].filter((group) => group.items.length > 0),
    unassigned,
  };
}

export async function enrichDepartmentProcedureCounts<
  T extends {
    id: string;
    slug: string;
    kind: "virtual" | "org_unit";
    procedureCount: number;
  },
>(tenantId: string, departments: T[]): Promise<T[]> {
  const [workflows, orgUnits] = await Promise.all([
    loadTenantWorkflows(tenantId),
    prisma.orgUnit.findMany({
      where: { tenantId, isActive: true },
      include: { template: { select: { definition: true } } },
    }),
  ]);

  const orgById = new Map(orgUnits.map((org) => [org.id, org]));
  const virtualCounts = new Map<string, number>();
  for (const def of VIRTUAL_OFFICE_DEPARTMENTS) {
    virtualCounts.set(def.slug, 0);
  }

  for (const workflow of workflows) {
    const agentNames = agentNamesFromWorkflow(workflow);
    const virtualSlug = resolveWorkflowVirtualDepartment(agentNames);
    if (virtualSlug) {
      virtualCounts.set(virtualSlug, (virtualCounts.get(virtualSlug) ?? 0) + 1);
    }
  }

  return departments.map((department) => {
    if (department.kind === "virtual") {
      return {
        ...department,
        procedureCount: virtualCounts.get(department.slug) ?? 0,
      };
    }

    const org = orgById.get(department.id);
    if (!org) return department;
    const staffAgentNames = suggestedAgentsFromOrgRecord(org);
    const defaultWorkflowName = readDefaultWorkflowName(org);
    const procedureCount = workflows.filter((workflow) =>
      workflowMatchesOrgUnit(workflow, staffAgentNames, defaultWorkflowName),
    ).length;
    return { ...department, procedureCount };
  });
}

export function resolveEncargoDepartmentContext(input: {
  teamAgents: string[];
  orgUnitId: string | null;
  orgUnitName: string | null;
  workflowName: string;
}): {
  departmentSlug: string | null;
  orgUnitId: string | null;
  orgUnitName: string | null;
  departmentHref: string | null;
  procedureLabel: string;
} {
  const procedureLabel = formatProcedureLabel(input.workflowName);
  if (input.orgUnitId) {
    return {
      departmentSlug: null,
      orgUnitId: input.orgUnitId,
      orgUnitName: input.orgUnitName,
      departmentHref: `/org-units/${input.orgUnitId}`,
      procedureLabel,
    };
  }

  const primaryAgent = input.teamAgents[0] ?? null;
  const departmentSlug =
    resolveWorkflowVirtualDepartment(input.teamAgents) ??
    resolveVirtualDepartmentForAgent(primaryAgent);

  return {
    departmentSlug,
    orgUnitId: null,
    orgUnitName: null,
    departmentHref: departmentSlug ? `/office/departments/${departmentSlug}` : null,
    procedureLabel,
  };
}
