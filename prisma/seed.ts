import "dotenv/config";
import { PrismaClient, AgentProvider } from "@prisma/client";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const prisma = new PrismaClient();
const REPO_ROOT = resolve(import.meta.dirname, "..");

interface Frontmatter {
  name?: string;
  description?: string;
  model?: string;
}

function parseFrontmatter(content: string): { meta: Frontmatter; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { meta: {}, body: content.trim() };
  }

  const meta: Frontmatter = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key === "name") meta.name = value;
    if (key === "description") meta.description = value;
    if (key === "model") meta.model = value;
  }

  return { meta, body: match[2].trim() };
}

function extractRole(body: string, fallback: string): string {
  const heading = body.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].replace(/^[^:]+:\s*/, "").trim();
  return fallback;
}

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function loadAgents() {
  const agentsDir = join(REPO_ROOT, ".claude", "agents");
  const files = (await readdir(agentsDir)).filter((f) => f.endsWith(".md"));
  const agents = [];

  for (const file of files.sort()) {
    const slug = file.replace(/\.md$/, "");
    const raw = await readFile(join(agentsDir, file), "utf-8");
    const { meta, body } = parseFrontmatter(raw);

    agents.push({
      name: meta.name ?? slug,
      role: extractRole(body, slugToTitle(slug)),
      systemPrompt: body,
      model:
        meta.model && meta.model !== "inherit"
          ? meta.model
          : (process.env.DEFAULT_MODEL ?? "claude-3-5-sonnet-20241022"),
      skillNames: inferSkillsForAgent(slug),
    });
  }

  return agents;
}

function inferSkillsForAgent(slug: string): string[] {
  const map: Record<string, string[]> = {
    "ceo-bezos": ["product-strategist", "premortem"],
    "cto-vogels": ["devops", "deep-analysis"],
    "critic-munger": ["premortem", "scientific-critical-thinking"],
    "product-norman": ["user-persona-creation", "ux-audit-rethink"],
    "ui-duarte": ["tailwind-v4-shadcn"],
    "interaction-cooper": ["user-persona-creation", "user-research-synthesis"],
    "fullstack-dhh": ["tailwind-v4-shadcn", "code-review-security"],
    "qa-bach": ["senior-qa", "security-audit"],
    "devops-hightower": ["devops"],
    "marketing-godin": ["content-strategy", "seo-content-strategist"],
    "operations-pg": ["community-led-growth", "ph-community-outreach"],
    "sales-ross": ["pricing-strategy", "cold-email-sequence-generator"],
    "cfo-campbell": ["financial-unit-economics", "startup-financial-modeling"],
    "research-thompson": ["deep-research", "competitive-intelligence-analyst"],
  };
  return map[slug] ?? [];
}

async function loadSkills() {
  const skillsRoot = join(REPO_ROOT, ".claude", "skills");
  const dirs = await readdir(skillsRoot, { withFileTypes: true });
  const skills = [];

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const skillPath = join(skillsRoot, dir.name, "SKILL.md");
    try {
      const raw = await readFile(skillPath, "utf-8");
      const { meta, body } = parseFrontmatter(raw);
      skills.push({
        name: meta.name ?? dir.name,
        description: meta.description ?? `Skill: ${dir.name}`,
        promptContent: raw.trim(),
      });
    } catch {
      // skip
    }
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

const DEFAULT_WORKFLOWS = [
  {
    name: "new-product-evaluation",
    description: "Research → CEO → Munger → Product → CTO → CFO",
    steps: [
      "research-thompson",
      "ceo-bezos",
      "critic-munger",
      "product-norman",
      "cto-vogels",
      "cfo-campbell",
    ],
  },
  {
    name: "feature-development",
    description: "Interaction → UI → Fullstack → QA → DevOps",
    steps: [
      "interaction-cooper",
      "ui-duarte",
      "fullstack-dhh",
      "qa-bach",
      "devops-hightower",
    ],
  },
  {
    name: "product-launch",
    description: "QA → DevOps → Marketing → Sales → Operations → CEO",
    steps: [
      "qa-bach",
      "devops-hightower",
      "marketing-godin",
      "sales-ross",
      "operations-pg",
      "ceo-bezos",
    ],
  },
];

/** Platform templates live with tenantId = null (no tenant is created by seed). */
async function upsertPlatformSkill(skill: {
  name: string;
  description: string;
  promptContent: string;
}) {
  const existing = await prisma.skill.findFirst({
    where: { tenantId: null, name: skill.name },
  });

  if (existing) {
    return prisma.skill.update({
      where: { id: existing.id },
      data: {
        description: skill.description,
        promptContent: skill.promptContent,
      },
    });
  }

  return prisma.skill.create({
    data: { tenantId: null, ...skill },
  });
}

async function upsertPlatformAgent(agent: {
  name: string;
  role: string;
  systemPrompt: string;
  model: string;
}) {
  const existing = await prisma.agent.findFirst({
    where: { tenantId: null, name: agent.name },
  });

  const data = {
    role: agent.role,
    systemPrompt: agent.systemPrompt,
    model: agent.model,
    provider: (process.env.DEFAULT_PROVIDER as AgentProvider) ?? "tokenlab",
    temperature: parseFloat(process.env.DEFAULT_TEMPERATURE ?? "0.7"),
  };

  if (existing) {
    return prisma.agent.update({ where: { id: existing.id }, data });
  }

  return prisma.agent.create({ data: { tenantId: null, name: agent.name, ...data } });
}

async function upsertPlatformWorkflow(wf: {
  name: string;
  description: string;
  steps: string[];
  agentByName: Map<string, string>;
}) {
  const existing = await prisma.workflow.findFirst({
    where: { tenantId: null, name: wf.name },
  });

  const workflow =
    existing ??
    (await prisma.workflow.create({
      data: { tenantId: null, name: wf.name, description: wf.description },
    }));

  if (existing) {
    await prisma.workflow.update({
      where: { id: workflow.id },
      data: { description: wf.description },
    });
  }

  await prisma.workflowEdge.deleteMany({ where: { workflowId: workflow.id } });
  await prisma.workflowStep.deleteMany({ where: { workflowId: workflow.id } });

  const stepIds: string[] = [];
  for (let i = 0; i < wf.steps.length; i++) {
    const agentName = wf.steps[i];
    const agentId = wf.agentByName.get(agentName);
    if (!agentId) {
      console.warn(`  ⚠ Agent not found for workflow step: ${agentName}`);
      continue;
    }

    const step = await prisma.workflowStep.create({
      data: {
        workflowId: workflow.id,
        agentId,
        stepOrder: i,
        label: agentName,
        positionX: 250,
        positionY: i * 150 + 50,
        inputConfig: { passSharedMemory: true },
        outputConfig: { appendToSharedMemory: true },
      },
    });
    stepIds.push(step.id);
  }

  for (let i = 0; i < stepIds.length - 1; i++) {
    await prisma.workflowEdge.create({
      data: {
        workflowId: workflow.id,
        sourceStepId: stepIds[i],
        targetStepId: stepIds[i + 1],
      },
    });
  }

  return workflow;
}

async function main() {
  console.log("🌱 Seeding platform templates (no tenant)…");

  const superAdminCount = await prisma.superAdmin.count();
  if (superAdminCount === 0) {
    console.log("  ℹ No superadmin yet — create one via /setup in the UI");
  }

  const skillRecords = await loadSkills();
  const skillByName = new Map<string, string>();

  for (const skill of skillRecords) {
    const record = await upsertPlatformSkill(skill);
    skillByName.set(skill.name, record.id);
  }
  console.log(`  ✓ ${skillRecords.length} platform skill templates`);

  const agentRecords = await loadAgents();
  const agentByName = new Map<string, string>();

  for (const agent of agentRecords) {
    const record = await upsertPlatformAgent(agent);
    agentByName.set(agent.name, record.id);

    for (const skillName of agent.skillNames) {
      const skillId = skillByName.get(skillName);
      if (!skillId) continue;
      await prisma.agentSkill.upsert({
        where: { agentId_skillId: { agentId: record.id, skillId } },
        update: {},
        create: { agentId: record.id, skillId },
      });
    }
  }
  console.log(`  ✓ ${agentRecords.length} platform agent templates`);

  for (const wf of DEFAULT_WORKFLOWS) {
    await upsertPlatformWorkflow({ ...wf, agentByName });
  }
  console.log(`  ✓ ${DEFAULT_WORKFLOWS.length} platform workflow templates`);

  console.log("✅ Seed complete (templates only — tenants created by superadmin)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
