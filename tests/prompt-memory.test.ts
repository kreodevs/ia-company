import test from "node:test";
import assert from "node:assert/strict";
import { APICallError } from "@ai-sdk/provider";
import { findApiCallError, formatLlmProviderError } from "../src/core/providers.js";
import { prepareSharedMemoryForPrompt } from "../src/lib/prompt-memory.js";

test("findApiCallError walks nested causes", () => {
  const apiErr = new APICallError({
    message: "Provider returned error",
    url: "https://openrouter.ai/api/v1/chat/completions",
    requestBodyValues: {},
    statusCode: 400,
    responseHeaders: {},
    responseBody: JSON.stringify({ error: { message: "Invalid request" } }),
  });
  const wrapped = new Error("Request failed", { cause: apiErr });
  assert.equal(findApiCallError(wrapped)?.statusCode, 400);
});

test("formatLlmProviderError includes nested OpenRouter body", () => {
  const apiErr = new APICallError({
    message: "Provider returned error",
    url: "https://openrouter.ai/api/v1/chat/completions",
    requestBodyValues: {},
    statusCode: 400,
    responseHeaders: {},
    responseBody: JSON.stringify({ error: { message: "Invalid JSON schema for tool" } }),
  });
  const message = formatLlmProviderError(new Error("Request failed", { cause: apiErr }), {
    provider: "openrouter",
    model: "google/gemini-3.5-flash-lite",
  });
  assert.match(message, /Invalid JSON schema for tool/);
  assert.match(message, /HTTP 400/);
});

test("prepareSharedMemoryForPrompt unwraps STUCK and truncates consensus", () => {
  const prepared = prepareSharedMemoryForPrompt({
    task: 'STUCK on "Define the first product" — pivot: ship smallest vertical slice today',
    nextAction: 'STUCK on "Define the first product" — pivot: ship smallest vertical slice today',
    consensus: "x".repeat(20_000),
  });
  assert.equal(prepared.task, "Define the first product");
  assert.equal(prepared.nextAction, "Define the first product");
  assert.match(String(prepared.consensus), /truncated 8000 chars/);
});
