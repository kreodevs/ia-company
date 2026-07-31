import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  documentMatchesReferencedPath,
  extractReferencedDocPath,
  extractReferencedDocPaths,
} from "../src/lib/referenced-doc-path.js";

describe("referenced-doc-path", () => {
  it("extracts backtick-wrapped docs paths from evidence summaries", () => {
    const summary =
      "Auditoría completada para WebhookPulse. Documentado en `docs/product/webhookpulse_ux_norman_cycle_55.md`.";
    assert.equal(
      extractReferencedDocPath(summary),
      "docs/product/webhookpulse_ux_norman_cycle_55.md",
    );
  });

  it("extracts plain docs paths", () => {
    const text = "See docs/research/market-brief.md for details.";
    assert.deepEqual(extractReferencedDocPaths(text), ["docs/research/market-brief.md"]);
  });

  it("matches document paths by full path or basename", () => {
    assert.equal(
      documentMatchesReferencedPath(
        "docs/product/webhookpulse_ux_norman_cycle_55.md",
        "docs/product/webhookpulse_ux_norman_cycle_55.md",
      ),
      true,
    );
    assert.equal(
      documentMatchesReferencedPath(
        "projects/foo/docs/product/webhookpulse_ux_norman_cycle_55.md",
        "docs/product/webhookpulse_ux_norman_cycle_55.md",
      ),
      true,
    );
    assert.equal(
      documentMatchesReferencedPath(
        "docs/product/webhookpulse_ux_norman_cycle_55.md",
        "webhookpulse_ux_norman_cycle_55.md",
      ),
      true,
    );
  });
});
