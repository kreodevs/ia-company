import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../../src/lib/prisma.js";
import { listProductConsensusRevisions } from "../../src/lib/product-consensus.js";

const hasDb = Boolean(process.env.DATABASE_URL);

describe("product consensus revisions API (GAP-001 regression)", { skip: !hasDb }, () => {
  let tenantId = "";
  let productId = "";
  let consensusId = "";

  before(async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: "Revision Test Tenant",
        slug: `rev-test-${Date.now()}`,
      },
    });
    tenantId = tenant.id;

    const product = await prisma.tenantProduct.create({
      data: {
        tenantId,
        name: "Revision Product",
        slug: `rev-product-${Date.now()}`,
        phase: "building",
        goNoGo: "go",
      },
    });
    productId = product.id;

    const consensus = await prisma.productConsensus.create({
      data: {
        productId,
        tenantId,
        content: "# Product memory",
        cycleNumber: 2,
      },
    });
    consensusId = consensus.id;

    await prisma.productConsensusRevision.createMany({
      data: [
        {
          productId: consensusId,
          agentName: "research-thompson",
          stepOrder: 1,
          content: "Revision one",
        },
        {
          productId: consensusId,
          agentName: "ceo-bezos",
          stepOrder: 2,
          content: "Revision two",
        },
      ],
    });
  });

  after(async () => {
    if (consensusId) {
      await prisma.productConsensusRevision.deleteMany({ where: { productId: consensusId } }).catch(() => undefined);
      await prisma.productConsensus.deleteMany({ where: { id: consensusId } }).catch(() => undefined);
    }
    if (productId) {
      await prisma.tenantProduct.deleteMany({ where: { id: productId } }).catch(() => undefined);
    }
    if (tenantId) {
      await prisma.tenant.deleteMany({ where: { id: tenantId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it("listProductConsensusRevisions resolves tenant product id to consensus id", async () => {
    const revisions = await listProductConsensusRevisions(productId, 10);
    assert.equal(revisions.length, 2);
    assert.equal(revisions[0]?.agentName, "research-thompson");
    assert.equal(revisions[1]?.agentName, "ceo-bezos");
  });
});
