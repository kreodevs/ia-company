import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildStripeWebhookUrl,
  serializeTenantProductForClient,
} from "../src/lib/product-serializer.js";

describe("product serializer", () => {
  it("strips webhook secret from client payload", () => {
    const serialized = serializeTenantProductForClient({
      id: "p1",
      tenantId: "t1",
      slug: "snapog",
      name: "SnapOG",
      description: null,
      phase: "growing",
      pipelineRank: 0,
      goNoGo: "go",
      revenueUsd: 10,
      lastRunId: null,
      githubRepoUrl: null,
      githubDefaultBranch: null,
      metadata: { stripeWebhookSecret: "whsec_hidden", revenueLastSyncedAt: "2026-07-24T00:00:00.000Z" },
      intakeStatus: "skipped",
      intakeRunId: null,
      opencodeDefaultAgent: null,
      opencodeDefaultModel: null,
      opencodeProjectPath: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    assert.equal(serialized.stripeWebhookConfigured, true);
    assert.equal(serialized.revenueLastSyncedAt, "2026-07-24T00:00:00.000Z");
    assert.equal("metadata" in serialized, false);
  });

  it("builds stripe webhook url", () => {
    assert.equal(
      buildStripeWebhookUrl("prod_123", "https://app.example.com/api"),
      "https://app.example.com/api/webhooks/stripe/prod_123",
    );
  });
});
