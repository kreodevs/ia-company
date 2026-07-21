import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../../src/lib/prisma.js";
import { syncPlatformTemplatesToTenant } from "../../src/server/lib/clone-templates.js";

const hasDb = Boolean(process.env.DATABASE_URL);

describe("platform template sync", { skip: !hasDb }, () => {
  const slug = `sync-test-${Date.now()}`;
  let tenantId = "";
  let platformSkillId = "";

  before(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? "integration-test-secret";

    const tenant = await prisma.tenant.create({
      data: {
        name: "Sync Test Tenant",
        slug,
        consensus: {
          create: { content: "# test", nextAction: "test" },
        },
      },
    });
    tenantId = tenant.id;

    const skill = await prisma.skill.create({
      data: {
        tenantId: null,
        name: `platform-skill-${slug}`,
        description: "Platform skill",
        promptContent: "v1",
      },
    });
    platformSkillId = skill.id;
  });

  after(async () => {
    if (!tenantId) return;
    await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => undefined);
    if (platformSkillId) {
      await prisma.skill.delete({ where: { id: platformSkillId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it("merge adds missing platform skill to tenant", async () => {
    const stats = await syncPlatformTemplatesToTenant(tenantId, "merge");
    assert.ok(stats.skills.added >= 1);

    const tenantSkill = await prisma.skill.findFirst({
      where: { tenantId, platformSourceId: platformSkillId },
    });
    assert.ok(tenantSkill);
    assert.equal(tenantSkill.name, `platform-skill-${slug}`);
  });

  it("update renames tenant copy when platform template is renamed", async () => {
    const renamed = `platform-skill-renamed-${slug}`;
    await prisma.skill.update({
      where: { id: platformSkillId },
      data: { name: renamed, promptContent: "v2" },
    });

    const stats = await syncPlatformTemplatesToTenant(tenantId, "update");
    assert.ok(stats.skills.updated >= 1);

    const tenantSkill = await prisma.skill.findFirst({
      where: { tenantId, platformSourceId: platformSkillId },
    });
    assert.ok(tenantSkill);
    assert.equal(tenantSkill.name, renamed);
    assert.equal(tenantSkill.promptContent, "v2");
  });
});
