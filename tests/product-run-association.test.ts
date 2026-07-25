import test from "node:test";
import assert from "node:assert/strict";
import {
  extractRunProductMemory,
  extractRunTaskPreview,
  runBelongsToProduct,
} from "../src/lib/product-run-association.js";

const product = {
  id: "prod-1",
  slug: "alebrije-memoria",
  lastRunId: "run-linked",
};

test("extractRunProductMemory reads productId and slug from shared memory", () => {
  const mem = extractRunProductMemory({
    productId: "prod-1",
    focusProductSlug: "alebrije-memoria",
  });
  assert.equal(mem.productId, "prod-1");
  assert.equal(mem.focusProductSlug, "alebrije-memoria");
});

test("runBelongsToProduct matches lastRunId and memory stamps", () => {
  assert.equal(
    runBelongsToProduct({ id: "run-linked", sharedMemory: {} }, product),
    true,
  );
  assert.equal(
    runBelongsToProduct(
      { id: "run-other", sharedMemory: { productId: "prod-1" } },
      product,
    ),
    true,
  );
  assert.equal(
    runBelongsToProduct(
      { id: "run-other", sharedMemory: { focusProductSlug: "alebrije-memoria" } },
      product,
    ),
    true,
  );
  assert.equal(
    runBelongsToProduct({ id: "run-other", sharedMemory: {} }, product),
    false,
  );
});

test("runBelongsToProduct shows tenant-scoped runs on focus product war room", () => {
  assert.equal(
    runBelongsToProduct(
      { id: "run-tenant", sharedMemory: { task: "Discovery" } },
      product,
      { isFocusProduct: true },
    ),
    true,
  );
  assert.equal(
    runBelongsToProduct(
      { id: "run-tenant", sharedMemory: { task: "Discovery" } },
      product,
      { isFocusProduct: false },
    ),
    false,
  );
});

test("extractRunTaskPreview prefers task over nextAction", () => {
  assert.equal(
    extractRunTaskPreview({ task: "SEO audit", nextAction: "Other" }),
    "SEO audit",
  );
  assert.equal(extractRunTaskPreview({ nextAction: "Weekly review" }), "Weekly review");
  assert.equal(extractRunTaskPreview({}), null);
});
