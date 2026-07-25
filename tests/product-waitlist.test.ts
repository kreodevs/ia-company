import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseWaitlistMetadata } from "../src/lib/product-waitlist.js";

describe("product waitlist metadata", () => {
  it("parses waitlist API key from product metadata", () => {
    assert.equal(parseWaitlistMetadata({ waitlistApiKey: "abc123" }).waitlistApiKey, "abc123");
    assert.equal(parseWaitlistMetadata({}).waitlistApiKey, undefined);
    assert.equal(parseWaitlistMetadata(null).waitlistApiKey, undefined);
  });
});
