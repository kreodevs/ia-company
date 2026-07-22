import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeOpencodeDiff } from "../src/lib/opencode-diff.js";
import { OpencodeClient } from "../src/lib/opencode-client.js";

describe("normalizeOpencodeDiff", () => {
  it("normalizes path and file keys", () => {
    const rows = normalizeOpencodeDiff([
      { path: "src/a.ts", additions: 3, deletions: 1 },
      { file: "README.md" },
    ]);
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.path, "src/a.ts");
    assert.equal(rows[1]?.path, "README.md");
  });
});

describe("OpencodeClient permissions", () => {
  it("extracts pending permission ids from nested payloads", () => {
    const client = new OpencodeClient({
      tenantId: "t1",
      enabled: true,
      baseUrl: "http://example.com",
      username: "opencode",
      password: "secret",
      defaultAgent: null,
      defaultModel: null,
      projectPath: null,
      pollIntervalMs: 5000,
      maxWaitMs: 60000,
      autoApprovePermissions: true,
    });

    const ids = client.extractPendingPermissionIds(
      { permissions: [{ permissionID: "perm-1", status: "pending" }] },
      [{ parts: [{ type: "permission", permissionId: "perm-2", pending: true }] }],
    );

    assert.ok(ids.includes("perm-1"));
    assert.ok(ids.includes("perm-2"));
  });
});
