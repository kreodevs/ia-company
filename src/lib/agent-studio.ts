import { prisma } from "./prisma.js";
import { MUNGER_AGENT_NAME } from "./munger-veto.js";
import {
  AGENT_FEW_SHOT_EXAMPLES,
  CATALOG_STUDIO_LLM_RULES,
  SKILL_FEW_SHOT_EXAMPLES,
} from "./catalog-studio-fewshots.js";
import {
  buildTenantMcpCatalogSection,
  loadPlatformAgentStyleExamples,
  listTenantMcpServerSummaries,
  matchMcpServersFromBrief,
} from "./catalog-studio-context.js";
import {
  CATALOG_STUDIO_MAX_TOKENS_MUNGER,
  CATALOG_STUDIO_MAX_TOKENS_PROPOSE,
  assertCatalogStudioProposeRateLimit,
  generateCatalogJson,
} from "./catalog-studio-llm.js";
import type { AgentStudioProposal, McpGrantProposal, NewSkillDraft, StudioMungerReview } from "./catalog-studio-types.js";
import type { SuggestedAgentDef } from "./org-os-types.js";
import { loadOrgUnitContext } from "./org-context.js";
import {
  ensureTenantAgents,
  ensureTenantSkill,
  linkAgentNameToOrgUnit,
  linkAgentSkillsByName,
  listTenantAgentsForCatalog,
  listTenantSkillsForCatalog,
  slugifyCatalogName,
} from "./tenant-catalog.js";
import { grantAgentMcpServerAccess } from "./mcp-registry.js";

function parseNewSkillDrafts(raw: unknown): NewSkillDraft[] {
  if (!Array.isArray(raw)) return [];
  const out: NewSkillDraft[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = typeof o.name === "string" ? slugifyCatalogName(o.name) : "";
    const description = typeof o.description === "string" ? o.description.trim() : "";
    const promptContent = typeof o.promptContent === "string" ? o.promptContent.trim() : "";
    if (name && description && promptContent) {
      out.push({ name, description, promptContent });
    }
  }
  return out;
}

function parseAgentDef(raw: unknown): SuggestedAgentDef | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === "string" ? slugifyCatalogName(o.name) : "";
  const role = typeof o.role === "string" ? o.role.trim() : "";
  const systemPrompt = typeof o.systemPrompt === "string" ? o.systemPrompt.trim() : "";
  if (!name || !role || !systemPrompt) return undefined;
  const skillNames = Array.isArray(o.skillNames)
    ? o.skillNames.filter((s): s is string => typeof s === "string").map(slugifyCatalogName)
    : [];
  return { name, role, systemPrompt, skillNames };
}

function parseMcpGrantProposals(
  raw: unknown,
  servers: Array<{ id: string; slug: string; name: string; toolNames: string[] }>,
): McpGrantProposal[] {
  if (!Array.isArray(raw)) return [];
  const out: McpGrantProposal[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const serverSlug =
      typeof o.serverSlug === "string"
        ? slugifyCatalogName(o.serverSlug)
        : typeof o.serverId === "string"
          ? ""
          : "";
    const server =
      servers.find((row) => row.id === o.serverId) ??
      servers.find((row) => row.slug === serverSlug);
    if (!server) continue;

    let toolNames: string[] | null = null;
    if (Array.isArray(o.toolNames)) {
      const filtered = o.toolNames
        .filter((name): name is string => typeof name === "string")
        .filter((name) => server.toolNames.includes(name));
      toolNames = filtered.length > 0 ? filtered : null;
    }

    out.push({
      serverId: server.id,
      serverSlug: server.slug,
      serverName: server.name,
      toolNames,
      reason:
        typeof o.reason === "string" && o.reason.trim()
          ? o.reason.trim()
          : `Grant access to ${server.name}`,
    });
  }
  return out;
}

export async function reviewAgentProposalWithMunger(
  tenantId: string,
  proposal: AgentStudioProposal,
): Promise<StudioMungerReview> {
  const target = proposal.reuse
    ? `Reuse agent "${proposal.reuse.existingAgentName}"`
    : proposal.agent
      ? `New agent "${proposal.agent.name}" (${proposal.agent.role})`
      : "Empty proposal";

  try {
    const parsed = await generateCatalogJson(
      tenantId,
      [
        `You are Charlie Munger (${MUNGER_AGENT_NAME}). Review a proposed AI agent for a tenant company.`,
        'Respond ONLY with JSON: { "notes": "string", "veto": null | { "by": "critic-munger", "reason": "fatal flaw" } }',
        "Veto for: incoherent role, duplicate of existing agent, no clear deliverable, or unsafe scope.",
      ].join("\n"),
      [
        `Brief: ${proposal.brief}`,
        target,
        `New skills suggested: ${proposal.newSkills.map((s) => s.name).join(", ") || "none"}`,
      ].join("\n"),
      CATALOG_STUDIO_MAX_TOKENS_MUNGER,
      0.3,
    );

    if (!parsed) {
      return { approved: true, notes: "Munger review inconclusive — proceeding." };
    }

    const vetoRaw = parsed.veto;
    if (
      vetoRaw &&
      typeof vetoRaw === "object" &&
      typeof (vetoRaw as { reason?: string }).reason === "string" &&
      (vetoRaw as { reason: string }).reason.trim()
    ) {
      return {
        approved: false,
        notes: typeof parsed.notes === "string" ? parsed.notes : "",
        veto: { by: MUNGER_AGENT_NAME, reason: (vetoRaw as { reason: string }).reason.trim() },
      };
    }

    return {
      approved: true,
      notes: typeof parsed.notes === "string" ? parsed.notes : "Munger: no fatal flaws detected.",
    };
  } catch {
    return { approved: true, notes: "Munger review skipped (LLM unavailable)." };
  }
}

export async function proposeAgentWithLlm(
  tenantId: string,
  brief: string,
  options: { orgUnitId?: string } = {},
): Promise<AgentStudioProposal> {
  const trimmed = brief.trim();
  if (trimmed.length < 8) {
    throw new Error("Brief must be at least 8 characters.");
  }

  await assertCatalogStudioProposeRateLimit(tenantId);
  const [agents, skills, mcpServers, platformExamples, mcpCatalog] = await Promise.all([
    listTenantAgentsForCatalog(tenantId),
    listTenantSkillsForCatalog(tenantId),
    listTenantMcpServerSummaries(tenantId),
    loadPlatformAgentStyleExamples(),
    buildTenantMcpCatalogSection(tenantId),
  ]);

  const briefMcpHints = matchMcpServersFromBrief(trimmed, mcpServers);
  const hintedServers = mcpServers.filter((server) => briefMcpHints.includes(server.id));

  let orgHint = "";
  if (options.orgUnitId) {
    const orgCtx = await loadOrgUnitContext(tenantId, options.orgUnitId);
    if (orgCtx) {
      const provisioned = agents
        .filter((agent) => orgCtx.suggestedAgentNames.includes(agent.name))
        .map((agent) => `${agent.name} (${agent.role})`);
      const missing = orgCtx.suggestedAgentNames.filter(
        (name) => !agents.some((agent) => agent.name === name),
      );
      orgHint = [
        `Department: ${orgCtx.orgUnitName} (${orgCtx.orgUnitType}).`,
        `Template roster: ${orgCtx.suggestedAgentNames.join(", ") || "(none)"}.`,
        `Already in AI Team: ${provisioned.join("; ") || "(none)"}.`,
        `Missing roles to hire: ${missing.join(", ") || "(none)"}.`,
        `design.md excerpt: ${(orgCtx.orgUnitDesignMd ?? "").slice(0, 400)}`,
        missing.length
          ? "Prioritize proposing the highest-impact MISSING role from the template roster."
          : "The department can grow beyond the starter template — propose additional roles when asked.",
      ]
        .filter(Boolean)
        .join(" ");
    }
  }

  const parsed = await generateCatalogJson(
    tenantId,
    [
      ...CATALOG_STUDIO_LLM_RULES,
      "Task: propose ONE agent for the tenant catalog.",
      "Prefer reuse of existing tenant agent when fit ≥80%.",
      "When the brief mentions MCP servers or external tools, READ the MCP catalog below and design the agent around concrete tool names and workflows.",
      "systemPrompt MUST follow platform agent style: markdown sections ## Rol, ## Persona, ## Principios (or domain equivalent), ## Flujo operativo, ## Formato de salida, JSON handoff when in workflows.",
      "systemPrompt length: substantial (400–1200 words) — not a one-liner.",
      "Always link tenant-mcp-tools when the agent uses MCP; add domain-specific newSkills for tool sequences (e.g. theforge-project-intake).",
      "mcpGrants: servers this agent needs at runtime — use serverSlug from catalog; toolNames = subset or omit/null for all enabled tools.",
      "existingSkillNames: skills already in tenant to link (must match names exactly).",
      "newSkills: ONLY skills that do NOT exist yet — user must approve each before creation.",
      'JSON reuse: { "reuse": { "existingAgentName": "kebab", "reason": "..." } }',
      'JSON new: { "agent": { "name", "role", "systemPrompt", "skillNames": [] }, "existingSkillNames": [], "newSkills": [{ "name", "description", "promptContent" }], "mcpGrants": [{ "serverSlug", "toolNames": ["tool_a"] | null, "reason": "..." }] }',
      "Never return reuse and agent together.",
    ].join("\n"),
    [
      `Brief: ${trimmed}`,
      orgHint,
      hintedServers.length > 0
        ? `Brief likely targets MCP server(s): ${hintedServers.map((s) => s.slug).join(", ")}`
        : "",
      mcpCatalog,
      `Existing agents: ${agents.map((a) => `${a.name} (${a.role})`).join("; ") || "(none)"}`,
      `Existing skills: ${skills.map((s) => s.name).join(", ") || "(none)"}`,
      `Platform agent style examples (match structure and depth):\n${JSON.stringify(platformExamples)}`,
      `Compact tenant template examples:\n${JSON.stringify(AGENT_FEW_SHOT_EXAMPLES)}`,
      `Skill examples:\n${JSON.stringify(SKILL_FEW_SHOT_EXAMPLES)}`,
    ].join("\n\n"),
    CATALOG_STUDIO_MAX_TOKENS_PROPOSE,
  );

  let proposal: AgentStudioProposal = {
    brief: trimmed,
    existingSkillNames: [],
    newSkills: [],
    mcpGrants: [],
  };

  if (parsed?.reuse && typeof parsed.reuse === "object") {
    const r = parsed.reuse as Record<string, unknown>;
    const existingAgentName =
      typeof r.existingAgentName === "string" ? slugifyCatalogName(r.existingAgentName) : "";
    const match = agents.find((a) => a.name === existingAgentName);
    if (match) {
      proposal.reuse = {
        existingAgentId: match.id,
        existingAgentName: match.name,
        reason: typeof r.reason === "string" ? r.reason : "Matches existing role.",
      };
    }
  }

  if (!proposal.reuse) {
    const agent = parseAgentDef(parsed?.agent);
    if (agent) proposal.agent = agent;

    if (Array.isArray(parsed?.existingSkillNames)) {
      proposal.existingSkillNames = parsed.existingSkillNames
        .filter((s): s is string => typeof s === "string")
        .map(slugifyCatalogName)
        .filter((name) => skills.some((s) => s.name === name));
    }

    proposal.newSkills = parseNewSkillDrafts(parsed?.newSkills).filter(
      (draft) => !skills.some((s) => s.name === draft.name),
    );

    proposal.mcpGrants = parseMcpGrantProposals(parsed?.mcpGrants, mcpServers);

    if (
      proposal.mcpGrants.length === 0 &&
      hintedServers.length > 0 &&
      proposal.agent
    ) {
      proposal.mcpGrants = hintedServers.map((server) => ({
        serverId: server.id,
        serverSlug: server.slug,
        serverName: server.name,
        toolNames: null,
        reason: `Brief references ${server.name} MCP integration.`,
      }));
    }

    if (proposal.mcpGrants.length > 0 && proposal.agent) {
      const hasMcpSkill = [
        ...proposal.existingSkillNames,
        ...(proposal.agent.skillNames ?? []),
        ...proposal.newSkills.map((skill) => skill.name),
      ].includes("tenant-mcp-tools");
      if (!hasMcpSkill) {
        proposal.existingSkillNames = [
          ...new Set([...proposal.existingSkillNames, "tenant-mcp-tools"]),
        ].filter((name) => skills.some((skill) => skill.name === name));
        if (!proposal.existingSkillNames.includes("tenant-mcp-tools")) {
          proposal.agent.skillNames = [
            ...new Set([...(proposal.agent.skillNames ?? []), "tenant-mcp-tools"]),
          ];
        }
      }
    }
  }

  if (!proposal.reuse && !proposal.agent) {
    throw new Error("LLM did not return a valid agent proposal. Try rephrasing the brief.");
  }

  proposal.mungerReview = await reviewAgentProposalWithMunger(tenantId, proposal);
  return proposal;
}

export async function applyAgentProposal(
  tenantId: string,
  input: {
    proposal: AgentStudioProposal;
    approved: boolean;
    approvedNewSkillNames?: string[];
    orgUnitId?: string;
  },
) {
  const { proposal, approved, approvedNewSkillNames = [], orgUnitId } = input;

  if (proposal.mungerReview && !proposal.mungerReview.approved) {
    throw new Error(`VETO: ${proposal.mungerReview.veto?.reason ?? "Munger blocked this agent."}`);
  }

  if (proposal.reuse) {
    const agent = await prisma.agent.findFirst({
      where: { id: proposal.reuse.existingAgentId, tenantId },
      include: { skills: { include: { skill: true } } },
    });
    if (!agent) throw new Error("Reused agent no longer exists.");
    if (orgUnitId) {
      await linkAgentNameToOrgUnit(tenantId, orgUnitId, agent.name);
    }
    return { agent, created: false, reused: true, skillsCreated: [] as string[] };
  }

  if (!proposal.agent) {
    throw new Error("No agent to create.");
  }

  if (!approved) {
    throw new Error("Human approval required: set approved=true to create this agent.");
  }

  const approvedSet = new Set(approvedNewSkillNames.map(slugifyCatalogName));
  const skillsCreated: string[] = [];

  for (const draft of proposal.newSkills) {
    if (!approvedSet.has(draft.name)) {
      throw new Error(
        `Skill "${draft.name}" was not approved. Pass approvedNewSkillNames including each new skill to create.`,
      );
    }
    const result = await ensureTenantSkill(tenantId, draft);
    if (result.created) skillsCreated.push(result.name);
  }

  const agentName = slugifyCatalogName(proposal.agent.name);
  let agent = await prisma.agent.findFirst({
    where: { tenantId, name: agentName },
    include: { skills: { include: { skill: true } } },
  });

  const created = !agent;
  if (!agent) {
    await ensureTenantAgents(tenantId, [proposal.agent]);
    agent = await prisma.agent.findFirst({
      where: { tenantId, name: agentName },
      include: { skills: { include: { skill: true } } },
    });
  }

  if (!agent) throw new Error("Failed to create agent.");

  const linkNames = [
    ...proposal.existingSkillNames,
    ...(proposal.agent.skillNames ?? []),
    ...proposal.newSkills.filter((s) => approvedSet.has(s.name)).map((s) => s.name),
  ];
  const uniqueLink = [...new Set(linkNames.map(slugifyCatalogName))];
  await linkAgentSkillsByName(tenantId, agent.name, uniqueLink);

  agent = await prisma.agent.findFirst({
    where: { id: agent.id },
    include: { skills: { include: { skill: true } } },
  });

  if (orgUnitId && agent) {
    await linkAgentNameToOrgUnit(tenantId, orgUnitId, agent.name);
  }

  const mcpGrantsApplied: string[] = [];
  if (proposal.mcpGrants?.length && agent) {
    for (const grant of proposal.mcpGrants) {
      await grantAgentMcpServerAccess(
        tenantId,
        agent.id,
        grant.serverId,
        grant.toolNames,
      );
      mcpGrantsApplied.push(grant.serverSlug);
    }
    agent = await prisma.agent.findFirst({
      where: { id: agent.id },
      include: { skills: { include: { skill: true } } },
    });
  }

  return { agent, created, reused: false, skillsCreated, mcpGrantsApplied };
}
