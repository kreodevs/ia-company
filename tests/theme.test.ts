import test from "node:test";
import assert from "node:assert/strict";

const storage = new Map<string, string>();

function mockBrowserStorage() {
  globalThis.localStorage = {
    get length() {
      return storage.size;
    },
    clear() {
      storage.clear();
    },
    getItem(key: string) {
      return storage.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      storage.set(key, value);
    },
    removeItem(key: string) {
      storage.delete(key);
    },
    key(index: number) {
      return [...storage.keys()][index] ?? null;
    },
  } as Storage;

  globalThis.document = {
    documentElement: { dataset: {} as DOMStringMap },
  } as Document;
}

test("theme defaults to letter (Stripe HDS Light) when unset", async () => {
  storage.clear();
  mockBrowserStorage();
  const { getStoredTheme, DEFAULT_THEME } = await import("../frontend/src/lib/theme.ts");
  assert.equal(DEFAULT_THEME, "letter");
  assert.equal(getStoredTheme(), "letter");
});

test("theme persists slash selection", async () => {
  storage.clear();
  mockBrowserStorage();
  const { applyTheme, getStoredTheme } = await import("../frontend/src/lib/theme.ts");
  applyTheme("slash");
  assert.equal(storage.get("auto-company-ui-theme"), "slash");
  assert.equal(getStoredTheme(), "slash");
});

test("theme migrates legacy letter to paperclip once", async () => {
  storage.clear();
  mockBrowserStorage();
  const { getStoredTheme } = await import("../frontend/src/lib/theme.ts");
  storage.set("auto-company-ui-theme", "letter");
  assert.equal(getStoredTheme(), "paperclip");
  assert.equal(storage.get("auto-company-ui-theme"), "paperclip");
  assert.equal(storage.get("auto-company-ui-theme-v3"), "1");
});

test("theme keeps letter after migration flag for new Stripe default", async () => {
  storage.clear();
  mockBrowserStorage();
  const { getStoredTheme } = await import("../frontend/src/lib/theme.ts");
  storage.set("auto-company-ui-theme-v3", "1");
  storage.set("auto-company-ui-theme", "letter");
  assert.equal(getStoredTheme(), "letter");
});
