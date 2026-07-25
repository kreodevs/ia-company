import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterActionablePipelineIdeas,
  filterNewPipelineIdeas,
  findIdeaToEvaluate,
  findProductForIdea,
  normalizePipelineIdeaKey,
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

  it("normalizes idea titles for deduplication", () => {
    assert.equal(normalizePipelineIdeaKey("ClientSync Flow"), "clientsync-flow");
    assert.equal(normalizePipelineIdeaKey("  DevMemory CLI  "), "devmemory-cli");
  });

  it("filters duplicate pipeline ideas before insert", () => {
    const incoming = [
      { title: "ClientSync Flow", interestScore: 1 },
      { title: "clientsync flow", interestScore: 0.5 },
      { title: "WebhookPulse", interestScore: 1 },
    ];
    const filtered = filterNewPipelineIdeas(
      incoming,
      ["DevMemory CLI"],
      products,
    );
    assert.equal(filtered.length, 2);
    assert.equal(filtered[0].title, "ClientSync Flow");
    assert.equal(filtered[1].title, "WebhookPulse");
  });

  it("skips ideas that already match a registered product", () => {
    const filtered = filterNewPipelineIdeas(
      [{ title: "RouterAI Smart Proxy" }],
      [],
      products,
    );
    assert.equal(filtered.length, 0);
  });
});
