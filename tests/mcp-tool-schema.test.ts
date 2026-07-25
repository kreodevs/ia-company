import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMcpToolKey,
  parseMcpInputSchemaJson,
  sanitizeMcpInputSchema,
  sanitizeMcpToolDescription,
} from "../src/lib/mcp-tool-schema.js";

test("sanitizeMcpInputSchema strips $schema and sets additionalProperties false", () => {
  const sanitized = sanitizeMcpInputSchema({
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
      limit: { type: "integer" },
    },
    required: ["query"],
    additionalProperties: true,
  });

  assert.equal(sanitized.type, "object");
  assert.equal(sanitized.additionalProperties, false);
  assert.deepEqual(sanitized.required, ["query"]);
  assert.ok(sanitized.properties && typeof sanitized.properties === "object");
  assert.equal(("$schema" in sanitized), false);
});

test("sanitizeMcpInputSchema collapses oneOf to first branch", () => {
  const sanitized = sanitizeMcpInputSchema({
    type: "object",
    properties: {
      value: {
        oneOf: [{ type: "string" }, { type: "number" }],
      },
    },
  });

  const props = sanitized.properties as Record<string, Record<string, unknown>>;
  assert.equal(props.value.type, "string");
});

test("parseMcpInputSchemaJson handles invalid JSON safely", () => {
  const parsed = parseMcpInputSchemaJson("{not-json");
  assert.equal(parsed.type, "object");
  assert.deepEqual(parsed.properties, {});
});

test("buildMcpToolKey stays unique when names are long", () => {
  const longName = "tool_" + "x".repeat(100);
  const key = buildMcpToolKey("context7", longName);
  assert.match(key, /^mcp_[a-zA-Z0-9_]+_[a-f0-9]{8}$/);
  assert.ok(key.length <= 64);
});

test("sanitizeMcpToolDescription truncates long descriptions", () => {
  const desc = sanitizeMcpToolDescription("a".repeat(2_000));
  assert.ok(desc.length <= 1_025);
});
