import type { ExecutionStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { suggestedAgentsFromOrgRecord } from "./org-context.js";

export type OfficeDepartmentKind = "virtual" | "org_unit";

export interface VirtualOfficeDepartmentDef {
  slug: string;
  labelKey: string;
  descKey: string;
  emoji: string;
  accent: "strategy" | "product" | "engineering" | "business";
  agentNames: string[];
}

export const VIRTUAL_OFFICE_DEPARTMENTS: VirtualOfficeDepartmentDef[] = [
  {
    slug: "strategy",
    labelKey: "office.departments.strategy.name",
    descKey: "office.departments.strategy.desc",
    emoji: "🔍",
    accent: "strategy",
    agentNames: ["research-thompson", "ceo-bezos", "critic-munger"],
  },
  {
    slug: "product",
    labelKey: "office.departments.product.name",
    descKey: "office.departments.product.desc",
    emoji: "🧭",
    accent: "product",
    agentNames: ["product-norman", "interaction-cooper", "ui-duarte"],
  },
  {
    slug: "engineering",
    labelKey: "office.departments.engineering.name",
    descKey: "office.departments.engineering.desc",
    emoji: "🛠️",
    accent: "engineering",
    agentNames: ["cto-vogels", "fullstack-dhh", "qa-bach", "devops-hightower"],
  },
  {
    slug: "business",
    labelKey: "office.departments.business.name",
    descKey: "office.departments.business.desc",
    emoji: "💰",
    accent: "business",
    agentNames: ["cfo-campbell", "sales-ross", "operations-pg", "marketing-godin"],
  },
];

export interface OfficeDepartmentRoom {
  id: string;
  slug: string;
  kind: OfficeDepartmentKind;
  labelKey: string | null;
  name: string | null;
  descKey: string | null;
  description: string | null;
  emoji: string;
  accent: VirtualOfficeDepartmentDef["accent"] | "custom";
  agentNames: string[];
  status: "idle" | "busy";
  busyAgentCount: number;
  activeRunCount: number;
  activeEncargoHref: string | null;
  procedureCount: number;
  href: string;
}

interface AgentStatusRow {
  name: string;
  status: "idle" | "busy";
}

interface ActiveRunRow {
  id: string;
  sharedMemory: unknown;
}

function memoryOrgUnitId(memory: unknown): string | null {
  if (!memory || typeof memory !== "object") return null;
  const id = (memory as { orgUnitId?: unknown }).orgUnitId;
  return typeof id === "string" ? id : null;
}

function memoryTeamAgents(memory: unknown): string[] {
  if (!memory || typeof memory !== "object") return [];
  const raw = (memory as { teamAgents?: unknown }).teamAgents;
  return Array.isArray(raw) ? raw.filter((n): n is string => typeof n === "string") : [];
}

function countRunsForAgents(runs: ActiveRunRow[], agentNames: string[]): number {
  const set = new Set(agentNames);
  return runs.filter((run) => {
    const mem = run.sharedMemory;
    const current = memoryTeamAgents(mem);
    if (current.some((n) => set.has(n))) return true;
    return false;
  }).length;
}

export function buildVirtualRoom(
  def: VirtualOfficeDepartmentDef,
  agents: AgentStatusRow[],
  activeRuns: ActiveRunRow[],
): OfficeDepartmentRoom {
  const deptAgents = agents.filter((a) => def.agentNames.includes(a.name));
  const busyAgentCount = deptAgents.filter((a) => a.status === "busy").length;
  const activeRunCount = countRunsForAgents(activeRuns, def.agentNames);
  const status = busyAgentCount > 0 || activeRunCount > 0 ? "busy" : "idle";
  const firstRun = activeRuns.find((run) => {
    const team = memoryTeamAgents(run.sharedMemory);
    return team.some((n) => def.agentNames.includes(n));
  });

  return {
    id: `virtual:${def.slug}`,
    slug: def.slug,
    kind: "virtual",
    labelKey: def.labelKey,
    name: null,
    descKey: def.descKey,
    description: null,
    emoji: def.emoji,
    accent: def.accent,
    agentNames: def.agentNames,
    status,
    busyAgentCount,
    activeRunCount: Math.max(activeRunCount, busyAgentCount > 0 ? 1 : 0),
    activeEncargoHref: firstRun ? `/office/encargos/${firstRun.id}` : null,
    procedureCount: 0,
    href: `/office/departments/${def.slug}`,
  };
}

function buildOrgUnitRoom(
  org: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    type: string;
    config: unknown;
    template: { definition: unknown } | null;
  },
  suggestedAgentNames: string[],
  agents: AgentStatusRow[],
  activeRuns: ActiveRunRow[],
): OfficeDepartmentRoom {
  const deptAgents = agents.filter((a) => suggestedAgentNames.includes(a.name));
  const busyAgentCount = deptAgents.filter((a) => a.status === "busy").length;
  const runsForOrg = activeRuns.filter((run) => memoryOrgUnitId(run.sharedMemory) === org.id);
  const activeRunCount = Math.max(runsForOrg.length, countRunsForAgents(activeRuns, suggestedAgentNames));
  const status = busyAgentCount > 0 || runsForOrg.length > 0 ? "busy" : "idle";

  return {
    id: org.id,
    slug: org.slug,
    kind: "org_unit",
    labelKey: null,
    name: org.name,
    descKey: null,
    description: org.description,
    emoji: "🏢",
    accent: "custom",
    agentNames: suggestedAgentNames,
    status,
    busyAgentCount,
    activeRunCount,
    activeEncargoHref: runsForOrg[0] ? `/office/encargos/${runsForOrg[0]!.id}` : null,
    procedureCount: 0,
    href: `/org-units/${org.id}`,
  };
}

export function resolveVirtualDepartmentForAgent(agentName: string | null | undefined): string | null {
  if (!agentName) return null;
  for (const dept of VIRTUAL_OFFICE_DEPARTMENTS) {
    if (dept.agentNames.includes(agentName)) return dept.slug;
  }
  return null;
}

export async function buildOfficeDepartmentRooms(
  tenantId: string,
  agents: Array<{ id: string; name: string; status: "idle" | "busy" }>,
): Promise<OfficeDepartmentRoom[]> {
  const activeStatuses: ExecutionStatus[] = ["PENDING", "RUNNING", "DELEGATED", "AWAITING_USER"];

  const [orgUnits, activeRuns] = await Promise.all([
    prisma.orgUnit.findMany({
      where: { tenantId, isActive: true },
      include: { template: { select: { definition: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.executionRun.findMany({
      where: { tenantId, status: { in: activeStatuses } },
      select: { id: true, sharedMemory: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const agentRows: AgentStatusRow[] = agents.map((a) => ({
    name: a.name,
    status: a.status,
  }));

  const virtualRooms = VIRTUAL_OFFICE_DEPARTMENTS.map((def) =>
    buildVirtualRoom(def, agentRows, activeRuns),
  );

  const orgRooms = orgUnits.map((org) => {
    const suggested = suggestedAgentsFromOrgRecord(org);
    return buildOrgUnitRoom(org, suggested, agentRows, activeRuns);
  });

  return [...virtualRooms, ...orgRooms];
}
