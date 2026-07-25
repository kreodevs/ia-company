import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mergeOpencodeRunOverrides,
  mergeProductOpencodeDefaults,
  readOpencodeRunOverrides,
} from "../src/lib/product-opencode.js";
import { OPENCODE_CONFIRM_REASON } from "../src/lib/opencode-bridge.js";

describe("opencode run overrides", () => {
  it("readOpencodeRunOverrides extracts memory fields", () => {
    const overrides = readOpencodeRunOverrides({
      opencodeRunOverrides: {
        agent: "build",
        model: "claude-sonnet",
        projectPath: "projects/acme",
      },
    });
    assert.equal(overrides?.agent, "build");
    assert.equal(overrides?.model, "claude-sonnet");
    assert.equal(overrides?.projectPath, "projects/acme");
  });

  it("mergeOpencodeRunOverrides prefers run overrides over product defaults", () => {
    const merged = mergeOpencodeRunOverrides(
      {
        defaultAgent: "default-agent",
        defaultModel: "default-model",
        projectPath: "projects/foo",
      },
      { model: "run-model", projectPath: "projects/bar" },
    );
    assert.equal(merged.defaultAgent, "default-agent");
    assert.equal(merged.defaultModel, "run-model");
    assert.equal(merged.projectPath, "projects/bar");
  });

  it("mergeProductOpencodeDefaults prefers product over tenant", () => {
    const merged = mergeProductOpencodeDefaults(
      { defaultAgent: "tenant-agent", defaultModel: "tenant-model", projectPath: "workspace/" },
      {
        opencodeDefaultAgent: null,
        opencodeDefaultModel: "product-model",
        opencodeProjectPath: null,
        slug: "acme",
      },
    );
    assert.equal(merged.defaultAgent, "tenant-agent");
    assert.equal(merged.defaultModel, "product-model");
    assert.equal(merged.projectPath, "workspace/");
  });

  it("mergeProductOpencodeDefaults falls back to projects/slug", () => {
    const merged = mergeProductOpencodeDefaults(
      { defaultAgent: null, defaultModel: null, projectPath: null },
      {
        opencodeDefaultAgent: null,
        opencodeDefaultModel: null,
        opencodeProjectPath: null,
        slug: "acme",
      },
    );
    assert.equal(merged.projectPath, "projects/acme");
  });

  it("exports opencode confirm reason constant", () => {
    assert.equal(OPENCODE_CONFIRM_REASON, "opencode_confirm");
  });
});
