import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatLlmProviderError } from "../src/core/providers.js";

describe("formatLlmProviderError", () => {
  it("adds provider context for generic provider failures", () => {
    const message = formatLlmProviderError(new Error("Provider returned error"), {
      provider: "openrouter",
      model: "google/gemini-3.5-flash-lite",
    });
    assert.match(message, /openrouter\/google\/gemini-3.5-flash-lite/);
    assert.match(message, /Platform settings/i);
  });
});
