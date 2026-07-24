import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatHttpFetchError } from "../src/lib/http-fetch.js";

describe("formatHttpFetchError", () => {
  it("explains localhost reachability", () => {
    const message = formatHttpFetchError(
      Object.assign(new Error("fetch failed"), { code: "ECONNREFUSED" }),
      "http://127.0.0.1:4096",
    );
    assert.match(message, /127\.0\.0\.1:4096/);
    assert.match(message, /connection refused|same container/i);
  });

  it("explains TLS certificate errors", () => {
    const message = formatHttpFetchError(
      Object.assign(new Error("fetch failed"), { code: "DEPTH_ZERO_SELF_SIGNED_CERT" }),
      "https://opencode.example.com",
    );
    assert.match(message, /TLS certificate error/i);
    assert.match(message, /OPENCODE_INSECURE_TLS/i);
  });
});
