import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TenantProduct } from "@prisma/client";
import { pickRotatingFocusProduct } from "../src/core/meta-orchestrator.js";

function product(slug: string, phase: TenantProduct["phase"] = "building"): TenantProduct {
  return {
    id: `id-${slug}`,
    tenantId: "tenant_1",
    slug,
    name: slug,
    description: null,
    phase,
    pipelineRank: 0,
    goNoGo: "go",
    revenueUsd: 0,
    lastRunId: null,
    githubRepo: null,
    opencodeDefaultAgent: null,
    opencodeDefaultModel: null,
    opencodeProjectPath: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("meta-orchestrator product rotation", () => {
  it("rotates focus across building products by cycle number", () => {
    const products = [product("alpha"), product("beta"), product("gamma")];

    assert.equal(pickRotatingFocusProduct(products, 1)?.slug, "alpha");
    assert.equal(pickRotatingFocusProduct(products, 2)?.slug, "beta");
    assert.equal(pickRotatingFocusProduct(products, 3)?.slug, "gamma");
    assert.equal(pickRotatingFocusProduct(products, 4)?.slug, "alpha");
  });

  it("returns null when no eligible products", () => {
    assert.equal(pickRotatingFocusProduct([], 1), null);
  });
});
