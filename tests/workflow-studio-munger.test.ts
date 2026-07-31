import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { plannedCatalogCoversGaps } from "../src/lib/workflow-studio.js";
import type { WorkflowStudioProposal } from "../src/lib/catalog-studio-types.js";

describe("plannedCatalogCoversGaps", () => {
  it("returns true when missing skills are proposed as newSkills", () => {
    const proposal: WorkflowStudioProposal = {
      brief: "Micro video tutorials from GitHub",
      workflow: {
        name: "micro-video-tutorial-generator",
        description: "Tutorial pipeline",
        steps: [
          { agentName: "cto-vogels", label: "Analyze repo" },
          { agentName: "video-narrator", label: "Record and TTS" },
        ],
      },
      gaps: {
        missingAgents: ["video-production-agent"],
        missingSkills: ["github-explorer", "agent-browser"],
        notes: "Needs browser and repo analysis skills",
      },
      newAgents: [
        {
          name: "video-narrator",
          role: "Video automation",
          systemPrompt: "Record and narrate",
          skillNames: ["agent-browser"],
        },
      ],
      newSkills: [
        {
          name: "github-explorer",
          description: "Analyze GitHub repos",
          promptContent: "Explore repos",
        },
        {
          name: "agent-browser",
          description: "Browser automation",
          promptContent: "Use browser tools",
        },
      ],
    };

    assert.equal(plannedCatalogCoversGaps(proposal), true);
  });

  it("returns false when a gap skill is not in newSkills", () => {
    const proposal: WorkflowStudioProposal = {
      brief: "Test",
      workflow: {
        name: "test-flow",
        description: "Test",
        steps: [{ agentName: "ceo-bezos" }],
      },
      gaps: { missingAgents: [], missingSkills: ["missing-skill"], notes: "" },
      newSkills: [],
    };

    assert.equal(plannedCatalogCoversGaps(proposal), false);
  });
});
