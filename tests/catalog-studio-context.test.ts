import test from "node:test";
import assert from "node:assert/strict";
import {
  loadPlatformAgentStyleExamples,
  matchMcpServersFromBrief,
} from "../src/lib/catalog-studio-context.js";

test("loadPlatformAgentStyleExamples returns structured platform agents", async () => {
  const examples = await loadPlatformAgentStyleExamples();
  assert.ok(examples.length >= 2);
  for (const example of examples) {
    assert.match(example.name, /-/);
    assert.ok(example.role.length > 3);
    assert.match(example.systemPrompt, /^## /m);
  }
});

test("matchMcpServersFromBrief finds servers mentioned in brief", () => {
  const servers = [
    { id: "s1", slug: "theforge", name: "TheForge MCP" },
    { id: "s2", slug: "stripe", name: "Stripe" },
  ];
  const matched = matchMcpServersFromBrief(
    "Necesito un agente que use el mcp de theforge para crear proyectos",
    servers,
  );
  assert.deepEqual(matched, ["s1"]);
});
