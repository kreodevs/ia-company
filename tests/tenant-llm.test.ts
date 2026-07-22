import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveAgentProviderConfig,
  resolveEffectiveModel,
  tenantLlmFromRecord,
} from "../src/lib/tenant-llm.js";

describe("resolveEffectiveModel", () => {
  it("prefers tenant override over platform model", () => {
    const result = resolveEffectiveModel(
      "legacy-agent-model",
      { defaultModel: "tenant/model" },
      { defaultModel: "platform/model" },
    );
    assert.deepEqual(result, { model: "tenant/model", source: "tenant" });
  });

  it("uses platform default model instead of legacy agent model", () => {
    const result = resolveEffectiveModel(
      "claude-3-5-sonnet-20241022",
      null,
      { defaultModel: "anthropic/claude-3.5-sonnet" },
    );
    assert.deepEqual(result, {
      model: "anthropic/claude-3.5-sonnet",
      source: "platform",
    });
  });

  it("ignores blank tenant override and falls back to platform model", () => {
    const result = resolveEffectiveModel(
      "legacy-agent-model",
      { defaultModel: "   " },
      { defaultModel: "openrouter/model" },
    );
    assert.deepEqual(result, { model: "openrouter/model", source: "platform" });
  });

  it("throws when platform model is not configured", () => {
    assert.throws(
      () => resolveEffectiveModel("claude-3-5-sonnet-20241022", null, { defaultModel: "  " }),
      /Platform default model is not configured/,
    );
  });
});

describe("tenantLlmFromRecord", () => {
  it("normalizes empty tenant model overrides to null", () => {
    assert.deepEqual(tenantLlmFromRecord({ defaultModel: "  ", maxCostUsdPerRun: null }), {
      defaultModel: null,
      maxCostUsdPerRun: null,
    });
  });
});

describe("resolveAgentProviderConfig", () => {
  it("uses the active platform provider with the resolved model", () => {
    const config = resolveAgentProviderConfig(
      {
        provider: "tokenlab",
        model: "claude-3-5-sonnet-20241022",
        temperature: 0.4,
      },
      null,
    );

    assert.equal(config.provider, "tokenlab");
    assert.equal(config.model, "claude-3-5-sonnet-20241022");
    assert.equal(config.temperature, 0.4);
  });
});
