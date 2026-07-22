import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterActionablePipelineIdeas,
  findIdeaToEvaluate,
  findProductForIdea,
} from "../src/lib/pipeline-utils.js";

describe("pipeline utils", () => {
  const products = [
    {
      id: "p1",
      tenantId: "t1",
      slug: "router-ai",
      name: "RouterAI",
      description: null,
      phase: "building" as const,
      pipelineRank: 0,
      goNoGo: "go" as const,
      revenueUsd: 0,
      lastRunId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const ideas = [
    {
      id: "i1",
      tenantId: "t1",
      title: "RouterAI (LLM Cost/Latency Smart Proxy)",
      description: "Proxy inteligente",
      rank: 0,
      goNoGo: "pending" as const,
      createdAt: new Date(),
    },
    {
      id: "i2",
      tenantId: "t1",
      title: "Instant Micro-SaaS Boiler",
      description: "Boilerplate",
      rank: 1,
      goNoGo: "pending" as const,
      createdAt: new Date(),
    },
  ];

  it("matches idea titles to product slugs", () => {
    assert.equal(findProductForIdea(ideas[0], products)?.slug, "router-ai");
    assert.equal(findProductForIdea(ideas[1], products), undefined);
  });

  it("filters ideas that already became products", () => {
    const filtered = filterActionablePipelineIdeas(ideas, products);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, "i2");
  });

  it("prefers approved ideas for evaluation", () => {
    const approved = { ...ideas[1], goNoGo: "go" as const };
    const pick = findIdeaToEvaluate([ideas[0], approved], products);
    assert.equal(pick?.id, approved.id);
  });
});
