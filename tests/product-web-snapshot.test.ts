import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPlainTextExcerpt,
  buildProductWebSnapshotPromptSection,
  extractHtmlTitle,
  htmlToPlainText,
} from "../src/lib/product-web-snapshot.js";

describe("product-web-snapshot", () => {
  it("strips html to plain text", () => {
    const text = htmlToPlainText("<html><body><h1>Hola</h1><p>Plan Pro $99/mes</p></body></html>");
    assert.match(text, /Hola/);
    assert.match(text, /Plan Pro/);
    assert.doesNotMatch(text, /<h1>/);
  });

  it("extracts title", () => {
    assert.equal(extractHtmlTitle("<title>MemorIA Pricing</title>"), "MemorIA Pricing");
  });

  it("prioritizes pricing signals in excerpt", () => {
    const excerpt = buildPlainTextExcerpt(
      "Welcome to our product. Plan Starter $19. Generic marketing copy. Plan Enterprise $199.",
      "pricing",
    );
    assert.match(excerpt, /Pricing signals/);
    assert.match(excerpt, /\$19/);
  });

  it("builds prompt section from snapshots", () => {
    const section = buildProductWebSnapshotPromptSection({
      website: null,
      pricing: {
        kind: "pricing",
        url: "https://memoria.app/pricing",
        fetchedAt: new Date().toISOString(),
        title: "Pricing",
        summary: "- Plan Pro: $99/mes",
        error: null,
      },
    });
    assert.match(section, /fuente autoritativa|authoritative/i);
    assert.match(section, /\$99/);
  });

  it("dedupes prompt when website and pricing share one URL", () => {
    const summary = "- Plan Pro: $99/mes";
    const section = buildProductWebSnapshotPromptSection({
      website: {
        kind: "website",
        url: "https://memoria.app",
        fetchedAt: new Date().toISOString(),
        title: "MemorIA",
        summary,
        error: null,
      },
      pricing: {
        kind: "pricing",
        url: "https://memoria.app",
        fetchedAt: new Date().toISOString(),
        title: "MemorIA",
        summary,
        error: null,
      },
    });
    assert.match(section, /misma URL|same URL/i);
    assert.equal((section.match(/Plan Pro/g) ?? []).length, 1);
  });
});
