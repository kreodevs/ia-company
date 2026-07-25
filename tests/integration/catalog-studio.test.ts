import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../../src/lib/prisma.js";
import { applyAgentProposal } from "../../src/lib/agent-studio.js";
import { applySkillProposal } from "../../src/lib/skill-studio.js";
import {
  linkAgentNameToOrgUnit,
  listTenantAgentsForCatalog,
  listTenantSkillsForCatalog,
} from "../../src/lib/tenant-catalog.js";
import { loadOrgUnitContext } from "../../src/lib/org-context.js";
import type { AgentStudioProposal, SkillStudioProposal } from "../../src/lib/catalog-studio-types.js";

const hasDb = Boolean(process.env.DATABASE_URL);

describe("catalog studio integration", { skip: !hasDb }, () => {
  const slug = `catalog-int-${Date.now()}`;
  let tenantId = "";
  let orgUnitId = "";

  before(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? "integration-test-secret";

    const tenant = await prisma.tenant.create({
      data: {
        name: "Catalog Studio Test",
        slug,
        consensus: { create: { content: "# test", nextAction: "test" } },
      },
    });
    tenantId = tenant.id;

    const org = await prisma.orgUnit.create({
      data: {
        tenantId,
        slug: `${slug}-dept`,
        name: "Test Dept",
        type: "department",
        config: {},
        configSchema: {},
        tokens: {},
        workspacePath: `org/${slug}-dept`,
      },
    });
    orgUnitId = org.id;
  });

  after(async () => {
    if (tenantId) {
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it("apply skill proposal creates tenant skill", async () => {
    const proposal: SkillStudioProposal = {
      brief: "integration test skill",
      skill: {
        name: `int-skill-${slug}`,
        description: "Integration skill",
        promptContent: "You test catalog studio apply.",
      },
      mungerReview: { approved: true, notes: "ok" },
    };

    const result = await applySkillProposal(tenantId, { proposal, approved: true });
    assert.equal(result.created, true);
    assert.ok(result.skill?.id);

    const listed = await listTenantSkillsForCatalog(tenantId);
    assert.ok(listed.some((s) => s.name === proposal.skill!.name));
  });

  it("apply agent proposal creates tenant agent", async () => {
    const proposal: AgentStudioProposal = {
      brief: "integration test agent",
      agent: {
        name: `int-agent-${slug}`,
        role: "Integration tester",
        systemPrompt: "You verify catalog studio flows.",
        skillNames: [],
      },
      existingSkillNames: [],
      newSkills: [],
      mungerReview: { approved: true, notes: "ok" },
    };

    const result = await applyAgentProposal(tenantId, {
      proposal,
      approved: true,
    });
    assert.equal(result.created, true);
    assert.ok(result.agent?.id);

    const listed = await listTenantAgentsForCatalog(tenantId);
    assert.ok(listed.some((a) => a.name === proposal.agent!.name));
  });

  it("linkAgentNameToOrgUnit merges linkedAgentNames into org context", async () => {
    const agentName = `int-agent-${slug}`;
    await linkAgentNameToOrgUnit(tenantId, orgUnitId, agentName);

    const ctx = await loadOrgUnitContext(tenantId, orgUnitId);
    assert.ok(ctx);
    assert.ok(ctx.suggestedAgentNames.includes(agentName));
  });
});
