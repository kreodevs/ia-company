import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimateSessionCostUsd,
  getModelCapability,
  modelSupportsTools,
  resolveSessionLlmConfig,
} from "../src/core/provider-router.js";

// Provider settings are resolved lazily, so this supplies the fallback key before
// the first router resolution in this process.
process.env.OPENROUTER_API_KEY ??= "test-openrouter-key";

describe("ProviderRouter capabilities", () => {
  it("recognizes tool-capable chat models and rejects media models", () => {
    assert.equal(modelSupportsTools("gpt-4o-mini", "chat"), true);
    assert.equal(modelSupportsTools("black-forest-labs/flux-schnell", "image"), false);
  });

  it("uses known model pricing and the conservative unknown-model fallback", () => {
    assert.deepEqual(getModelCapability("gpt-4o-mini"), {
      supportsTools: true,
      contextWindow: 128_000,
      inputPer1M: 0.15,
      outputPer1M: 0.6,
      tier: "cheap",
    });
    assert.equal(estimateSessionCostUsd("gpt-4o-mini", 1_000_000, 1_000_000), 0.75);
    assert.equal(estimateSessionCostUsd("vendor/unknown-chat", 1_000_000, 1_000_000), 4);
  });

  it("falls back to a tool-capable OpenRouter model for a media session", async () => {
    const resolved = await resolveSessionLlmConfig({
      agent: {
        provider: "replicate",
        model: "black-forest-labs/flux-schnell",
        modelKind: "image",
        temperature: 0.2,
      },
    });

    assert.equal(resolved.fellBack, true);
    assert.equal(resolved.config.provider, "openrouter");
    assert.equal(resolved.config.model, "openai/gpt-4o-mini");
    assert.match(resolved.fallbackReason ?? "", /does not support tool-calling/);
  });
});
