import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildConsensusContentAfterRun,
  formatConsensusFileBody,
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

  it("appends Next Action section when missing from consensus file body", () => {
    const body = formatConsensusFileBody("# Alebrije Labs Consensus\n\nShared memory.", "Evaluate idea A");
    assert.match(body, /# Alebrije Labs Consensus/);
    assert.match(body, /## Next Action\nEvaluate idea A/);
  });

  it("does not duplicate Next Action section", () => {
    const body = formatConsensusFileBody("# Doc\n\n## Next Action\nExisting", "Ignored");
    assert.equal(body.match(/## Next Action/g)?.length, 1);
    assert.doesNotMatch(body, /Ignored/);
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
