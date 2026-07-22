import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  enrichSharedMemoryFromAgentOutputs,
  extractTopIdeasFromText,
} from "../src/lib/structured-memory.js";

describe("structured memory extraction", () => {
  it("extracts topIdeas from fenced JSON", () => {
    const ideas = extractTopIdeasFromText(`
Here are three opportunities:

\`\`\`json
{
  "topIdeas": ["AI invoice parser", "Slack standup bot", "SEO audit SaaS"]
}
\`\`\`
`);
    assert.deepEqual(ideas, ["AI invoice parser", "Slack standup bot", "SEO audit SaaS"]);
  });

  it("extracts topIdeas from markdown section", () => {
    const ideas = extractTopIdeasFromText(`
## Top Ideas
1. Micro CRM for freelancers
2. Pricing page generator
3. Uptime alerts for indie SaaS
`);
    assert.equal(ideas.length, 3);
    assert.match(ideas[0], /Micro CRM/);
  });

  it("merges extracted topIdeas into shared memory", () => {
    const memory = enrichSharedMemoryFromAgentOutputs({
      "ceo-bezos": 'Decision:\n```json\n{"topIdeas":["Idea A","Idea B","Idea C"]}\n```',
    });
    assert.deepEqual(memory.topIdeas, ["Idea A", "Idea B", "Idea C"]);
  });
});
