import { prisma } from "./prisma.js";
import { MUNGER_AGENT_NAME } from "./munger-veto.js";
import {
  AGENT_FEW_SHOT_EXAMPLES,
  CATALOG_STUDIO_LLM_RULES,
  SKILL_FEW_SHOT_EXAMPLES,
  WORKFLOW_FEW_SHOT_EXAMPLES,
} from "./catalog-studio-fewshots.js";
import {
  CATALOG_STUDIO_MAX_TOKENS_MUNGER,
  CATALOG_STUDIO_MAX_TOKENS_PROPOSE,
  assertCatalogStudioProposeRateLimit,
  generateCatalogJson,
} from "./catalog-studio-llm.js";
import type {
  ApplyWorkflowStudioInput,
  NewSkillDraft,
  StudioMungerReview,
  WorkflowDraftProposal,
  WorkflowGapAnalysis,
  WorkflowStudioProposal,
  WorkflowStepProposal,
} from "./catalog-studio-types.js";
import type { SuggestedAgentDef } from "./org-os-types.js";
import {
  ensureTenantAgents,
  ensureTenantSkill,
  linkAgentSkillsByName,
  listTenantAgentsForCatalog,
  listTenantSkillsForCatalog,
  slugifyCatalogName,
} from "./tenant-catalog.js";

function parseNewSkillDrafts(raw: unknown): NewSkillDraft[] {
  if (!Array.isArray(raw)) return [];
  const out: NewSkillDraft[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = typeof o.name === "string" ? slugifyCatalogName(o.name) : "";
    const description = typeof o.description === "string" ? o.description.trim() : "";
    const promptContent = typeof o.promptContent === "string" ? o.promptContent.trim() : "";
    if (name && description && promptContent) out.push({ name, description, promptContent });
  }
  return out;
}

function parseAgentDefs(raw: unknown): SuggestedAgentDef[] {
  if (!Array.isArray(raw)) return [];
  const out: SuggestedAgentDef[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = typeof o.name === "string" ? slugifyCatalogName(o.name) : "";
    const role = typeof o.role === "string" ? o.role.trim() : "";
    const systemPrompt = typeof o.systemPrompt === "string" ? o.systemPrompt.trim() : "";
    if (!name || !role || !systemPrompt) continue;
    const skillNames = Array.isArray(o.skillNames)
      ? o.skillNames.filter((s): s is string => typeof s === "string").map(slugifyCatalogName)
      : [];
    out.push({ name, role, systemPrompt, skillNames });
  }
  return out;
}

function parseWorkflowDraft(raw: unknown): WorkflowDraftProposal | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === "string" ? slugifyCatalogName(o.name) : "";
  const description = typeof o.description === "string" ? o.description.trim() : "";
  const stepsRaw = o.steps;
  if (!name || !description || !Array.isArray(stepsRaw) || stepsRaw.length === 0) return undefined;

  const steps: WorkflowStepProposal[] = [];
  for (const step of stepsRaw) {
    if (!step || typeof step !== "object") continue;
    const s = step as Record<string, unknown>;
    const agentName = typeof s.agentName === "string" ? slugifyCatalogName(s.agentName) : "";
    if (!agentName) continue;
    steps.push({
      agentName,
      label: typeof s.label === "string" ? s.label.trim() : undefined,
    });
  }
  if (steps.length === 0) return undefined;
  return { name, description, steps };
}

function parseGapAnalysis(raw: unknown): WorkflowGapAnalysis | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const missingAgents = Array.isArray(o.missingAgents)
    ? o.missingAgents.filter((x): x is string => typeof x === "string")
    : [];
  const missingSkills = Array.isArray(o.missingSkills)
    ? o.missingSkills.filter((x): x is string => typeof x === "string")
    : [];
  const notes = typeof o.notes === "string" ? o.notes.trim() : "";
  if (!missingAgents.length && !missingSkills.length && !notes) return undefined;
  return { missingAgents, missingSkills, notes };
}

function buildBriefWithAnswers(brief: string, answers?: Record<string, string>): string {
  const trimmed = brief.trim();
  if (!answers || Object.keys(answers).length === 0) return trimmed;
  const lines = Object.entries(answers)
    .filter(([, value]) => value.trim())
    .map(([question, answer]) => `Q: ${question}\nA: ${answer.trim()}`);
  return lines.length ? `${trimmed}\n\n--- Clarifications ---\n${lines.join("\n\n")}` : trimmed;
}

/** True when every gap item is addressed by agents/skills the proposal will create on apply. */
export function plannedCatalogCoversGaps(proposal: WorkflowStudioProposal): boolean {
  const gaps = proposal.gaps;
  if (!gaps) return false;

  const newSkillNames = new Set((proposal.newSkills ?? []).map((skill) => slugifyCatalogName(skill.name)));
  const newAgentNames = new Set((proposal.newAgents ?? []).map((agent) => slugifyCatalogName(agent.name)));
  const stepAgentNames = new Set(
    (proposal.workflow?.steps ?? []).map((step) => slugifyCatalogName(step.agentName)),
  );

  const skillsCovered =
    gaps.missingSkills.length === 0 ||
    gaps.missingSkills.every((skill) => newSkillNames.has(slugifyCatalogName(skill)));

  const agentsCovered =
    gaps.missingAgents.length === 0 ||
    gaps.missingAgents.every((agent) => {
      const slug = slugifyCatalogName(agent);
      return newAgentNames.has(slug) || stepAgentNames.has(slug);
    }) ||
    (newAgentNames.size > 0 &&
      [...newAgentNames].some((name) => stepAgentNames.has(name)));

  const hasPlannedAdditions = newSkillNames.size > 0 || newAgentNames.size > 0;

  return hasPlannedAdditions && skillsCovered && agentsCovered;
}

function buildWorkflowMungerContext(proposal: WorkflowStudioProposal): string {
  const sections = [`Brief:\n${proposal.brief}`];

  if (proposal.workflow) {
    sections.push(
      `Workflow "${proposal.workflow.name}": ${proposal.workflow.description}`,
      `Execution order:\n${proposal.workflow.steps
        .map((step, index) => `${index + 1}. ${step.agentName}${step.label ? ` — ${step.label}` : ""}`)
        .join("\n")}`,
    );
  }

  if (proposal.existingAgentNames?.length) {
    sections.push(`Reused tenant agents: ${proposal.existingAgentNames.join(", ")}`);
  }

  if (proposal.gaps) {
    sections.push(`Gap analysis (already identified by designer):\n${JSON.stringify(proposal.gaps, null, 2)}`);
  }

  if (proposal.newAgents?.length) {
    sections.push(
      "New agents TO BE CREATED when the founder approves (before the workflow runs):\n" +
        JSON.stringify(
          proposal.newAgents.map((agent) => ({
            name: agent.name,
            role: agent.role,
            skillNames: agent.skillNames ?? [],
          })),
          null,
          2,
        ),
    );
  }

  if (proposal.newSkills?.length) {
    sections.push(
      "New skills TO BE CREATED when the founder approves (before the workflow runs):\n" +
        JSON.stringify(
          proposal.newSkills.map((skill) => ({ name: skill.name, description: skill.description })),
          null,
          2,
        ),
    );
  }

  return sections.join("\n\n");
}

function reconcileMungerWithPlannedCatalog(
  proposal: WorkflowStudioProposal,
  review: StudioMungerReview,
): StudioMungerReview {
  if (review.approved || !plannedCatalogCoversGaps(proposal)) return review;

  return {
    approved: true,
    notes: [
      review.notes,
      "Los huecos del análisis de cobertura quedan cubiertos por los agentes/skills nuevos propuestos; el fundador los aprueba antes de crear el flujo.",
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}

async function listTenantWorkflowExamples(tenantId: string) {
  const rows = await prisma.workflow.findMany({
    where: { tenantId },
    select: {
      name: true,
      description: true,
      steps: {
        select: { agent: { select: { name: true } }, label: true, stepOrder: true },
        orderBy: { stepOrder: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });
  return rows.map((row) => ({
    name: row.name,
    description: row.description ?? "",
    steps: row.steps.map((step) => ({
      agentName: step.agent.name,
      label: step.label ?? undefined,
    })),
  }));
}

export async function reviewWorkflowProposalWithMunger(
  tenantId: string,
  proposal: WorkflowStudioProposal,
): Promise<StudioMungerReview> {
  if (!proposal.workflow) {
    return { approved: true, notes: "Clarification-only — no workflow to review." };
  }

  try {
    const parsed = await generateCatalogJson(
      tenantId,
      [
        `You are Charlie Munger (${MUNGER_AGENT_NAME}). Review a proposed agent workflow for a tenant AI company.`,
        'Respond ONLY with JSON: { "notes": "string", "veto": null | { "by": "critic-munger", "reason": "fatal flaw" } }',
        "The proposal may include newAgents and newSkills that the founder approves and that are persisted BEFORE the workflow executes.",
        "Skills (e.g. github-explorer, agent-browser) ARE execution capabilities — do not veto because the tenant catalog lacks them today if newSkills already proposes them.",
        "Do NOT veto for missing agents/skills that gaps + newAgents + newSkills already address.",
        "Veto only for: incoherent sequence, illegal scope, impossible deliverable, or fatal flaws that remain AFTER counting planned catalog additions.",
      ].join("\n"),
      buildWorkflowMungerContext(proposal),
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
      const vetoReview: StudioMungerReview = {
        approved: false,
        notes: typeof parsed.notes === "string" ? parsed.notes : "",
        veto: { by: MUNGER_AGENT_NAME, reason: (vetoRaw as { reason: string }).reason.trim() },
      };
      return reconcileMungerWithPlannedCatalog(proposal, vetoReview);
    }

    return {
      approved: true,
      notes: typeof parsed.notes === "string" ? parsed.notes : "Munger: no fatal flaws detected.",
    };
  } catch {
    return { approved: true, notes: "Munger review skipped (LLM unavailable)." };
  }
}

export async function proposeWorkflowWithLlm(
  tenantId: string,
  brief: string,
  answers?: Record<string, string>,
): Promise<WorkflowStudioProposal> {
  const enrichedBrief = buildBriefWithAnswers(brief, answers);
  if (enrichedBrief.length < 12) {
    throw new Error("Brief must be at least 12 characters.");
  }

  await assertCatalogStudioProposeRateLimit(tenantId);

  const [agents, skills, workflowExamples] = await Promise.all([
    listTenantAgentsForCatalog(tenantId),
    listTenantSkillsForCatalog(tenantId),
    listTenantWorkflowExamples(tenantId),
  ]);

  const agentCatalog = agents.map((agent) => ({
    name: agent.name,
    role: agent.role,
    skills: agent.skills.map((link) => link.skill.name),
  }));

  const parsed = await generateCatalogJson(
    tenantId,
    [
      ...CATALOG_STUDIO_LLM_RULES,
      "Task: design ONE reusable agent workflow for the tenant.",
      "Use ONLY tenant agent names from the catalog for workflow.steps[].agentName.",
      "If the goal needs capabilities missing from agents/skills, propose newAgents and/or newSkills.",
      "If the brief is ambiguous (target product, output format, channel, language, scope), respond with needsClarification instead of guessing.",
      'JSON shape A (clarify): { "needsClarification": true, "questions": ["question 1", "question 2"] } — max 4 questions.',
      'JSON shape B (proposal): {',
      '  "workflow": { "name": "kebab-slug", "description": "one paragraph", "steps": [{ "agentName": "existing-or-new-agent", "label": "step purpose" }] },',
      '  "existingAgentNames": ["agents reused from catalog"],',
      '  "gaps": { "missingAgents": ["roles still uncovered"], "missingSkills": ["capabilities missing"], "notes": "summary" },',
      '  "newAgents": [{ "name", "role", "systemPrompt", "skillNames": [] }],',
      '  "newSkills": [{ "name", "description", "promptContent" }]',
      "}",
      "Never return both needsClarification and workflow.",
      "Workflow name: short kebab-case slug, unique and descriptive.",
      "Steps: 2–8 agents in execution order; each step must have a clear deliverable.",
    ].join("\n"),
    [
      `Brief:\n${enrichedBrief}`,
      `Tenant agents:\n${JSON.stringify(agentCatalog, null, 0) || "(none)"}`,
      `Tenant skills: ${skills.map((s) => s.name).join(", ") || "(none)"}`,
      `Existing workflows:\n${JSON.stringify(workflowExamples.slice(0, 5), null, 0) || "(none)"}`,
      `Workflow examples:\n${JSON.stringify(WORKFLOW_FEW_SHOT_EXAMPLES, null, 0)}`,
      `Agent examples:\n${JSON.stringify(AGENT_FEW_SHOT_EXAMPLES, null, 0)}`,
      `Skill examples:\n${JSON.stringify(SKILL_FEW_SHOT_EXAMPLES, null, 0)}`,
    ].join("\n\n"),
    CATALOG_STUDIO_MAX_TOKENS_PROPOSE,
  );

  const proposal: WorkflowStudioProposal = { brief: enrichedBrief };

  if (parsed?.needsClarification === true) {
    const questions = Array.isArray(parsed.questions)
      ? parsed.questions
          .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
          .slice(0, 4)
      : [];
    if (questions.length === 0) {
      throw new Error("LLM requested clarification but returned no questions. Try adding more detail.");
    }
    proposal.needsClarification = true;
    proposal.questions = questions;
    return proposal;
  }

  const workflow = parseWorkflowDraft(parsed?.workflow);
  if (!workflow) {
    throw new Error("LLM did not return a valid workflow proposal. Try rephrasing the brief.");
  }

  proposal.workflow = workflow;
  proposal.existingAgentNames = Array.isArray(parsed?.existingAgentNames)
    ? parsed.existingAgentNames
        .filter((n): n is string => typeof n === "string")
        .map(slugifyCatalogName)
    : [];
  proposal.gaps = parseGapAnalysis(parsed?.gaps);
  proposal.newAgents = parseAgentDefs(parsed?.newAgents);
  proposal.newSkills = parseNewSkillDrafts(parsed?.newSkills);
  proposal.mungerReview = await reviewWorkflowProposalWithMunger(tenantId, proposal);
  return proposal;
}

export async function applyWorkflowProposal(tenantId: string, input: ApplyWorkflowStudioInput) {
  const { proposal, approved } = input;
  if (!approved) {
    throw new Error("Human approval required: set approved=true to create this workflow.");
  }
  if (proposal.needsClarification || !proposal.workflow) {
    throw new Error("Cannot apply a clarification request — complete the brief first.");
  }
  if (proposal.mungerReview && !proposal.mungerReview.approved) {
    throw new Error(
      `VETO: ${proposal.mungerReview.veto?.reason ?? "Munger blocked this workflow."}`,
    );
  }

  const approvedSkillNames = new Set(
    (input.approvedNewSkillNames ?? []).map(slugifyCatalogName),
  );
  const approvedAgentNames = new Set(
    (input.approvedNewAgentNames ?? []).map(slugifyCatalogName),
  );

  for (const skill of proposal.newSkills ?? []) {
    if (!approvedSkillNames.has(skill.name)) continue;
    await ensureTenantSkill(tenantId, skill);
  }

  const agentsToCreate = (proposal.newAgents ?? []).filter((agent) =>
    approvedAgentNames.has(slugifyCatalogName(agent.name)),
  );
  if (agentsToCreate.length) {
    await ensureTenantAgents(tenantId, agentsToCreate);
    for (const agent of agentsToCreate) {
      if (agent.skillNames?.length) {
        await linkAgentSkillsByName(tenantId, agent.name, agent.skillNames);
      }
    }
  }

  const agentRows = await listTenantAgentsForCatalog(tenantId);
  const agentIdByName = new Map(agentRows.map((row) => [row.name, row.id]));

  const missingStepAgents = proposal.workflow.steps.filter(
    (step) => !agentIdByName.has(step.agentName),
  );
  if (missingStepAgents.length) {
    throw new Error(
      `Missing agents for workflow steps: ${missingStepAgents.map((s) => s.agentName).join(", ")}. Approve creating them or adjust the proposal.`,
    );
  }

  const existing = await prisma.workflow.findFirst({
    where: { tenantId, name: proposal.workflow.name },
    select: { id: true },
  });
  if (existing) {
    throw new Error(
      `A workflow named "${proposal.workflow.name}" already exists. Rename in the editor after apply or rephrase the brief.`,
    );
  }

  const workflow = await prisma.workflow.create({
    data: {
      tenantId,
      name: proposal.workflow.name,
      description: proposal.workflow.description,
      steps: {
        create: proposal.workflow.steps.map((step, index) => ({
          agentId: agentIdByName.get(step.agentName)!,
          stepOrder: index,
          label: step.label ?? step.agentName.replace(/-/g, " "),
          positionX: 80,
          positionY: index * 150,
          inputConfig: {},
          outputConfig: {},
        })),
      },
    },
    include: { steps: { orderBy: { stepOrder: "asc" } }, edges: true },
  });

  const orderedSteps = workflow.steps;
  if (orderedSteps.length > 1) {
    await prisma.workflowEdge.createMany({
      data: orderedSteps.slice(0, -1).map((step, index) => ({
        workflowId: workflow.id,
        sourceStepId: step.id,
        targetStepId: orderedSteps[index + 1]!.id,
      })),
    });
  }

  const full = await prisma.workflow.findUnique({
    where: { id: workflow.id },
    include: {
      steps: { include: { agent: true }, orderBy: { stepOrder: "asc" } },
      edges: true,
    },
  });

  return {
    workflow: full,
    skillsCreated: [...approvedSkillNames],
    agentsCreated: agentsToCreate.map((agent) => agent.name),
  };
}
