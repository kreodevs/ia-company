import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashPassword, verifyPassword } from "../src/lib/auth.js";

describe("delivery access PIN", () => {
  it("hashes and verifies PIN with bcrypt", async () => {
    const hash = await hashPassword("4829");
    assert.notEqual(hash, "4829");
    assert.equal(await verifyPassword("4829", hash), true);
    assert.equal(await verifyPassword("0000", hash), false);
  });
});
