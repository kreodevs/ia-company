import type { AutonomousSchedule, OrgUnit, Workflow } from "@prisma/client";
import { OFFICE_SERVICES } from "./office-coordinator.js";
import { parseScheduleConditions } from "./orchestration-conditions.js";
import { enrichSchedulesForTenant } from "./schedule-enrichment.js";
import type { ScheduleConditions } from "../types/orchestration.js";
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

export interface OfficeScheduledProcedureSummary {
  scheduleId: string;
  scheduleName: string;
  enabled: boolean;
  orchestrationMode: "fixed" | "meta_dynamic";
  workflowId: string | null;
  workflowName: string | null;
  procedureLabel: string | null;
  intervalSec: number;
  cronExpr: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  tenantTimezone: string;
  conditionsMet: boolean;
  currentSkipReason: string | null;
}

export interface OfficeDepartmentProceduresResponse {
  items: OfficeProcedureSummary[];
  scheduled: OfficeScheduledProcedureSummary[];
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

const VIRTUAL_DEPARTMENT_LINK_TAG = /<!--\s*office-dept-link:([\w-]+)\s*-->/g;

export function readLinkedWorkflowIds(org: { config: unknown }): string[] {
  const config = (org.config ?? {}) as Record<string, unknown>;
  if (!Array.isArray(config.linkedWorkflowIds)) return [];
  return config.linkedWorkflowIds.filter((id): id is string => typeof id === "string" && id.length > 0);
}

export function readVirtualDepartmentSlugFromWorkflow(description: string | null | undefined): string | null {
  if (!description) return null;
  const match = description.match(/<!--\s*office-dept-link:([\w-]+)\s*-->/);
  return match?.[1] ?? null;
}

function stripVirtualDepartmentLinkTags(description: string | null | undefined): string | null {
  const cleaned = (description ?? "").replace(VIRTUAL_DEPARTMENT_LINK_TAG, "").trim();
  return cleaned || null;
}

function withVirtualDepartmentLinkTag(description: string | null | undefined, departmentSlug: string): string {
  const base = stripVirtualDepartmentLinkTags(description);
  const tag = `<!-- office-dept-link:${departmentSlug} -->`;
  return base ? `${base}\n${tag}` : tag;
}

export function workflowBelongsToVirtualDepartment(
  workflow: WorkflowWithSteps,
  departmentSlug: string,
): boolean {
  if (readVirtualDepartmentSlugFromWorkflow(workflow.description) === departmentSlug) return true;
  return scheduleMatchesVirtualDepartmentSlug(workflow, departmentSlug);
}

function workflowMatchesOrgUnit(
  workflow: WorkflowWithSteps,
  staffAgentNames: string[],
  defaultWorkflowName: string | null,
  linkedWorkflowIds: string[] = [],
): boolean {
  if (linkedWorkflowIds.includes(workflow.id)) return true;
  if (defaultWorkflowName && workflow.name === defaultWorkflowName) return true;
  if (staffAgentNames.length === 0) return false;
  const staff = new Set(staffAgentNames);
  const workflowAgents = agentNamesFromWorkflow(workflow);
  if (workflowAgents.length === 0) return false;
  const overlap = workflowAgents.filter((name) => staff.has(name)).length;
  return overlap / workflowAgents.length >= 0.5;
}

function workflowMatchesOrgUnitRecord(
  workflow: WorkflowWithSteps,
  org: OrgUnit & { template: { definition: unknown } | null },
): boolean {
  return workflowMatchesOrgUnit(
    workflow,
    suggestedAgentsFromOrgRecord(org),
    readDefaultWorkflowName(org),
    readLinkedWorkflowIds(org),
  );
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

export function scheduleMatchesVirtualDepartmentSlug(
  workflow: WorkflowWithSteps | null,
  departmentSlug: string,
): boolean {
  if (!workflow) return false;
  const agentNames = agentNamesFromWorkflow(workflow);
  return resolveWorkflowVirtualDepartment(agentNames) === departmentSlug;
}

export function scheduleConditionsTargetOrgUnit(
  conditions: ScheduleConditions | null,
  orgUnitId: string,
): boolean {
  return conditions?.orgUnitId === orgUnitId;
}

function mapScheduleToScheduledProcedureSummary(
  schedule: AutonomousSchedule & {
    tenantTimezone: string;
    conditionsMet: boolean;
    currentSkipReason: string | null;
  },
  workflow: WorkflowWithSteps | null,
): OfficeScheduledProcedureSummary {
  const procedure = workflow ? mapWorkflowToProcedure(workflow) : null;
  return {
    scheduleId: schedule.id,
    scheduleName: schedule.name,
    enabled: schedule.enabled,
    orchestrationMode:
      schedule.orchestrationMode === "meta_dynamic" ? "meta_dynamic" : "fixed",
    workflowId: schedule.workflowId,
    workflowName: workflow?.name ?? null,
    procedureLabel:
      procedure?.procedureLabel ??
      (schedule.orchestrationMode === "meta_dynamic" ? schedule.name : null),
    intervalSec: schedule.intervalSec,
    cronExpr: schedule.cronExpr,
    nextRunAt: schedule.nextRunAt?.toISOString() ?? null,
    lastRunAt: schedule.lastRunAt?.toISOString() ?? null,
    tenantTimezone: schedule.tenantTimezone,
    conditionsMet: schedule.conditionsMet,
    currentSkipReason: schedule.currentSkipReason,
  };
}

async function listScheduledProceduresForDepartmentContext(
  tenantId: string,
  filter:
    | { kind: "virtual"; departmentSlug: string }
    | { kind: "org_unit"; orgUnit: OrgUnit & { template: { definition: unknown } | null } },
): Promise<OfficeScheduledProcedureSummary[]> {
  const [schedules, workflows] = await Promise.all([
    prisma.autonomousSchedule.findMany({
      where: { tenantId },
      orderBy: [{ enabled: "desc" }, { priority: "desc" }, { name: "asc" }],
    }),
    loadTenantWorkflows(tenantId),
  ]);

  const workflowById = new Map(workflows.map((workflow) => [workflow.id, workflow]));
  const enriched = await enrichSchedulesForTenant(tenantId, schedules);
  const items: OfficeScheduledProcedureSummary[] = [];

  for (const schedule of enriched) {
    const workflow = schedule.workflowId
      ? (workflowById.get(schedule.workflowId) ?? null)
      : null;
    const conditions = parseScheduleConditions(schedule.conditions);

    const matches =
      filter.kind === "virtual"
        ? workflow !== null && workflowBelongsToVirtualDepartment(workflow, filter.departmentSlug)
        : scheduleConditionsTargetOrgUnit(conditions, filter.orgUnit.id) ||
          (workflow ? workflowMatchesOrgUnitRecord(workflow, filter.orgUnit) : false);

    if (!matches) continue;

    items.push(mapScheduleToScheduledProcedureSummary(schedule, workflow));
  }

  return items;
}

export async function listProceduresForVirtualDepartment(
  tenantId: string,
  departmentSlug: string,
): Promise<OfficeDepartmentProceduresResponse> {
  const [workflows, scheduled] = await Promise.all([
    loadTenantWorkflows(tenantId),
    listScheduledProceduresForDepartmentContext(tenantId, {
      kind: "virtual",
      departmentSlug,
    }),
  ]);
  const items = workflows
    .filter((workflow) => workflowBelongsToVirtualDepartment(workflow, departmentSlug))
    .map(mapWorkflowToProcedure);
  return { items, scheduled };
}

export async function listProceduresForOrgUnit(
  tenantId: string,
  orgUnitId: string,
): Promise<OfficeDepartmentProceduresResponse> {
  const [workflows, orgUnit] = await Promise.all([
    loadTenantWorkflows(tenantId),
    prisma.orgUnit.findFirst({
      where: { id: orgUnitId, tenantId, isActive: true },
      include: { template: { select: { definition: true } } },
    }),
  ]);
  if (!orgUnit) return { items: [], scheduled: [] };

  const [items, scheduled] = await Promise.all([
    Promise.resolve(
      workflows
        .filter((workflow) => workflowMatchesOrgUnitRecord(workflow, orgUnit))
        .map(mapWorkflowToProcedure),
    ),
    listScheduledProceduresForDepartmentContext(tenantId, {
      kind: "org_unit",
      orgUnit,
    }),
  ]);

  return { items, scheduled };
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
    const items = workflows
      .filter((workflow) => {
        if (!workflowMatchesOrgUnitRecord(workflow, org)) return false;
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
    const items = workflows
      .filter((workflow) => {
        if (!workflowBelongsToVirtualDepartment(workflow, def.slug)) return false;
        if (orgAssignedIds.has(workflow.id)) return false;
        return true;
      })
      .map(mapWorkflowToProcedure);
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
    for (const def of VIRTUAL_OFFICE_DEPARTMENTS) {
      if (workflowBelongsToVirtualDepartment(workflow, def.slug)) {
        virtualCounts.set(def.slug, (virtualCounts.get(def.slug) ?? 0) + 1);
        break;
      }
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
    const procedureCount = workflows.filter((workflow) =>
      workflowMatchesOrgUnitRecord(workflow, org),
    ).length;
    return { ...department, procedureCount };
  });
}

async function seedWorkflowStepsFromAgentNames(
  tenantId: string,
  workflowId: string,
  agentNames: string[],
): Promise<WorkflowWithSteps | null> {
  const uniqueNames = [...new Set(agentNames.filter(Boolean))].slice(0, 6);
  if (uniqueNames.length === 0) return null;

  const agents = await prisma.agent.findMany({
    where: { tenantId, name: { in: uniqueNames }, isActive: true },
    orderBy: { name: "asc" },
  });
  if (agents.length === 0) return null;

  const orderedAgents = uniqueNames
    .map((name) => agents.find((agent) => agent.name === name))
    .filter((agent): agent is (typeof agents)[number] => Boolean(agent));

  await prisma.workflowStep.createMany({
    data: orderedAgents.map((agent, index) => ({
      workflowId,
      agentId: agent.id,
      stepOrder: index + 1,
      label: agent.role || agent.name.replace(/-/g, " "),
      positionX: 0,
      positionY: index * 150,
      inputConfig: {},
      outputConfig: {},
    })),
  });

  return prisma.workflow.findFirst({
    where: { id: workflowId, tenantId },
    include: {
      steps: {
        include: { agent: { select: { name: true } } },
        orderBy: { stepOrder: "asc" },
      },
    },
  });
}

async function linkWorkflowToOrgUnitRecord(
  org: OrgUnit & { template: { definition: unknown } | null },
  workflowId: string,
): Promise<void> {
  const config = { ...((org.config ?? {}) as Record<string, unknown>) };
  const linkedWorkflowIds = readLinkedWorkflowIds(org);
  if (!linkedWorkflowIds.includes(workflowId)) {
    config.linkedWorkflowIds = [...linkedWorkflowIds, workflowId];
  }
  await prisma.orgUnit.update({
    where: { id: org.id },
    data: { config: config as object },
  });
}

export async function linkWorkflowToOrgUnit(
  tenantId: string,
  orgUnitId: string,
  workflowId: string,
): Promise<OfficeProcedureSummary> {
  const [orgUnit, workflow] = await Promise.all([
    prisma.orgUnit.findFirst({
      where: { id: orgUnitId, tenantId, isActive: true },
      include: { template: { select: { definition: true } } },
    }),
    prisma.workflow.findFirst({
      where: { id: workflowId, tenantId },
      include: {
        steps: {
          include: { agent: { select: { name: true } } },
          orderBy: { stepOrder: "asc" },
        },
      },
    }),
  ]);
  if (!orgUnit) throw new Error("Org unit not found");
  if (!workflow) throw new Error("Workflow not found");

  await linkWorkflowToOrgUnitRecord(orgUnit, workflowId);
  return mapWorkflowToProcedure(workflow);
}

export async function linkWorkflowToVirtualDepartment(
  tenantId: string,
  departmentSlug: string,
  workflowId: string,
): Promise<OfficeProcedureSummary> {
  const department = VIRTUAL_OFFICE_DEPARTMENTS.find((def) => def.slug === departmentSlug);
  if (!department) throw new Error("Department not found");

  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, tenantId },
    include: {
      steps: {
        include: { agent: { select: { name: true } } },
        orderBy: { stepOrder: "asc" },
      },
    },
  });
  if (!workflow) throw new Error("Workflow not found");

  await prisma.workflow.update({
    where: { id: workflow.id },
    data: {
      description: withVirtualDepartmentLinkTag(workflow.description, departmentSlug),
    },
  });

  return mapWorkflowToProcedure({
    ...workflow,
    description: withVirtualDepartmentLinkTag(workflow.description, departmentSlug),
  });
}

export async function createDepartmentProcedure(
  tenantId: string,
  target: { orgUnitId: string } | { departmentSlug: string },
  input: { name: string; description?: string | null },
): Promise<OfficeProcedureSummary> {
  const name = input.name.trim();
  if (!name) throw new Error("name is required");

  let seedAgentNames: string[] = [];
  let orgUnit: (OrgUnit & { template: { definition: unknown } | null }) | null = null;
  let virtualDepartmentSlug: string | null = null;

  if ("orgUnitId" in target) {
    orgUnit = await prisma.orgUnit.findFirst({
      where: { id: target.orgUnitId, tenantId, isActive: true },
      include: { template: { select: { definition: true } } },
    });
    if (!orgUnit) throw new Error("Org unit not found");
    seedAgentNames = suggestedAgentsFromOrgRecord(orgUnit);
  } else {
    virtualDepartmentSlug = target.departmentSlug;
    const department = VIRTUAL_OFFICE_DEPARTMENTS.find((def) => def.slug === target.departmentSlug);
    if (!department) throw new Error("Department not found");
    seedAgentNames = department.agentNames;
  }

  const workflow = await prisma.workflow.create({
    data: {
      tenantId,
      name,
      description: input.description?.trim() || null,
    },
    include: {
      steps: {
        include: { agent: { select: { name: true } } },
        orderBy: { stepOrder: "asc" },
      },
    },
  });

  const seeded = await seedWorkflowStepsFromAgentNames(tenantId, workflow.id, seedAgentNames);
  const hydrated = seeded ?? workflow;

  if (orgUnit) {
    await linkWorkflowToOrgUnitRecord(orgUnit, workflow.id);
  } else if (virtualDepartmentSlug) {
    await prisma.workflow.update({
      where: { id: workflow.id },
      data: {
        description: withVirtualDepartmentLinkTag(hydrated.description, virtualDepartmentSlug),
      },
    });
  }

  const finalWorkflow = await prisma.workflow.findFirst({
    where: { id: workflow.id, tenantId },
    include: {
      steps: {
        include: { agent: { select: { name: true } } },
        orderBy: { stepOrder: "asc" },
      },
    },
  });
  if (!finalWorkflow) throw new Error("Workflow not found");
  return mapWorkflowToProcedure(finalWorkflow);
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
