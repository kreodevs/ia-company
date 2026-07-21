import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decryptSecret, encryptSecret } from "../src/lib/crypto.js";

describe("crypto", () => {
  it("encrypts and decrypts secrets", () => {
    process.env.JWT_SECRET = "test-secret-for-unit-tests-only";
    const plain = "sk-live-tenant-key-12345";
    const encrypted = encryptSecret(plain);
    assert.notEqual(encrypted, plain);
    assert.match(encrypted, /^enc:v1:/);
    assert.equal(decryptSecret(encrypted), plain);
  });

  it("passes through legacy plaintext keys", () => {
    assert.equal(decryptSecret("plain-api-key"), "plain-api-key");
  });
});
