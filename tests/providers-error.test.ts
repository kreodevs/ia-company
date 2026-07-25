import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { APICallError } from "@ai-sdk/provider";
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

  it("includes OpenRouter response body detail when available", () => {
    const message = formatLlmProviderError(
      new APICallError({
        message: "Provider returned error",
        url: "https://openrouter.ai/api/v1/chat/completions",
        requestBodyValues: {},
        statusCode: 401,
        responseHeaders: {},
        responseBody: JSON.stringify({ error: { message: "Invalid API key" } }),
      }),
      { provider: "openrouter", model: "google/gemini-3.5-flash-lite" },
    );
    assert.match(message, /Invalid API key/);
    assert.match(message, /HTTP 401/);
  });
});
