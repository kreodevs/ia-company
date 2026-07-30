import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveAgentProviderConfig,
  resolveEffectiveModel,
  resolveEffectiveProvider,
  resolvePlatformLlmConfig,
  tenantLlmFromRecord,
} from "../src/lib/tenant-llm.js";

describe("resolveEffectiveModel", () => {
  it("prefers agent model over tenant and platform", () => {
    const result = resolveEffectiveModel(
      "agent/model",
      { defaultModel: "tenant/model" },
      { defaultModel: "platform/model" },
    );
    assert.deepEqual(result, { model: "agent/model", source: "agent" });
  });

  it("prefers tenant override over platform model", () => {
    const result = resolveEffectiveModel(
      null,
      { defaultModel: "tenant/model" },
      { defaultModel: "platform/model" },
    );
    assert.deepEqual(result, { model: "tenant/model", source: "tenant" });
  });

  it("uses platform default when agent and tenant are unset", () => {
    const result = resolveEffectiveModel(null, null, { defaultModel: "anthropic/claude-3.5-sonnet" });
    assert.deepEqual(result, {
      model: "anthropic/claude-3.5-sonnet",
      source: "platform",
    });
  });

  it("ignores blank tenant override and falls back to platform model", () => {
    const result = resolveEffectiveModel(null, { defaultModel: "   " }, { defaultModel: "openrouter/model" });
    assert.deepEqual(result, { model: "openrouter/model", source: "platform" });
  });

  it("throws when platform model is not configured", () => {
    assert.throws(
      () => resolveEffectiveModel(null, null, { defaultModel: "  " }),
      /Platform default model is not configured/,
    );
  });
});

describe("resolveEffectiveProvider", () => {
  it("prefers agent provider over tenant and platform", () => {
    const result = resolveEffectiveProvider(
      "replicate",
      { defaultProvider: "openrouter" },
      { defaultProvider: "tokenlab" },
    );
    assert.deepEqual(result, { provider: "replicate", source: "agent" });
  });

  it("falls back to platform provider", () => {
    const result = resolveEffectiveProvider(null, null, { defaultProvider: "openrouter" });
    assert.deepEqual(result, { provider: "openrouter", source: "platform" });
  });
});

describe("tenantLlmFromRecord", () => {
  it("normalizes empty tenant model overrides to null", () => {
    assert.deepEqual(tenantLlmFromRecord({ defaultModel: "  ", maxCostUsdPerRun: null }), {
      defaultModel: null,
      defaultProvider: null,
      maxCostUsdPerRun: null,
    });
  });
});

describe("resolveAgentProviderConfig", () => {
  it("uses agent provider and model when set", () => {
    const config = resolveAgentProviderConfig(
      {
        provider: "replicate",
        model: "black-forest-labs/flux-schnell",
        modelKind: "image",
        temperature: 0.4,
      },
      null,
      {
        defaultProvider: "tokenlab",
        defaultModel: "claude-3-5-sonnet-20241022",
        defaultTemperature: 0.7,
      } as never,
    );

    assert.equal(config.provider, "replicate");
    assert.equal(config.model, "black-forest-labs/flux-schnell");
    assert.equal(config.modelKind, "image");
    assert.equal(config.temperature, 0.4);
    assert.equal(config.providerSource, "agent");
    assert.equal(config.modelSource, "agent");
  });

  it("inherits platform defaults when agent fields are null", () => {
    const config = resolveAgentProviderConfig(
      {
        provider: null,
        model: null,
        modelKind: "chat",
        temperature: 0.5,
      },
      null,
      {
        defaultProvider: "openrouter",
        defaultModel: "anthropic/claude-sonnet-4",
        defaultTemperature: 0.7,
      } as never,
    );

    assert.equal(config.provider, "openrouter");
    assert.equal(config.model, "anthropic/claude-sonnet-4");
    assert.equal(config.providerSource, "platform");
    assert.equal(config.modelSource, "platform");
  });
});

describe("resolvePlatformLlmConfig", () => {
  it("resolves tenant model for auxiliary LLM calls", () => {
    const config = resolvePlatformLlmConfig({ defaultModel: "tenant/chat" }, { temperature: 0.3 });
    assert.equal(config.model, "tenant/chat");
    assert.equal(config.modelKind, "chat");
  });
});
