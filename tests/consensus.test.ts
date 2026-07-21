import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildConsensusContentAfterRun,
  mergeConsensusIntoMemory,
} from "../src/lib/consensus.js";

describe("consensus helpers", () => {
  it("merges tenant consensus into initial memory", () => {
    const memory = mergeConsensusIntoMemory(
      { content: "# Doc", nextAction: "Ship feature X" },
      {},
    );
    assert.equal(memory.nextAction, "Ship feature X");
    assert.equal(memory.task, "Ship feature X");
    assert.equal(memory.consensus, "# Doc");
  });

  it("prefers explicit consensusUpdate after run", () => {
    const content = buildConsensusContentAfterRun("# Old", {
      consensusUpdate: "# New consensus",
      lastOutput: "ignored",
    });
    assert.equal(content, "# New consensus");
  });

  it("appends cycle summary when no explicit update", () => {
    const content = buildConsensusContentAfterRun("# Old", {
      lastAgent: "CEO",
      lastOutput: "Launch pricing page",
    });
    assert.match(content, /# Old/);
    assert.match(content, /CEO/);
    assert.match(content, /Launch pricing page/);
  });
});
