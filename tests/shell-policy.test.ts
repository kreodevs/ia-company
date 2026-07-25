import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertShellCommandAllowed, isShellCommandAllowed } from "../src/lib/shell-policy.js";

describe("shell-policy", () => {
  it("allows benign commands", () => {
    assert.doesNotThrow(() => assertShellCommandAllowed("npm test"));
    assert.doesNotThrow(() => assertShellCommandAllowed("git status"));
    assert.equal(isShellCommandAllowed("npm run build"), true);
  });

  it("blocks destructive repo and infra commands", () => {
    assert.throws(() => assertShellCommandAllowed("gh repo delete foo/bar"));
    assert.throws(() => assertShellCommandAllowed("wrangler delete my-worker"));
    assert.throws(() => assertShellCommandAllowed("git push --force origin main"));
    assert.throws(() => assertShellCommandAllowed("rm -rf /"));
  });

  it("blocks sensitive path reads via shell", () => {
    assert.throws(() => assertShellCommandAllowed("cat .env"));
    assert.throws(() => assertShellCommandAllowed("head ~/.ssh/id_rsa"));
  });
});
