import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../../src/lib/prisma.js";
import { updateWorkflowGraph } from "../../src/server/lib/workflow-graph.js";

const hasDb = Boolean(process.env.DATABASE_URL);

describe("updateWorkflowGraph", { skip: !hasDb }, () => {
  let workflowId = "";
  let agentId = "";

  before(async () => {
    const agent = await prisma.agent.create({
      data: {
        tenantId: null,
        name: `wf-graph-agent-${Date.now()}`,
        role: "test",
        systemPrompt: "test",
      },
    });
    agentId = agent.id;

    const workflow = await prisma.workflow.create({
      data: { tenantId: null, name: `wf-graph-${Date.now()}` },
    });
    workflowId = workflow.id;
  });

  after(async () => {
    if (workflowId) {
      await prisma.workflow.delete({ where: { id: workflowId } }).catch(() => undefined);
    }
    if (agentId) {
      await prisma.agent.delete({ where: { id: agentId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it("persists temp step ids and edges", async () => {
    const tempStepId = "temp-test-step";
    const result = await updateWorkflowGraph(workflowId, {
      name: "Updated workflow",
      steps: [
        {
          id: tempStepId,
          agentId,
          stepOrder: 0,
          positionX: 100,
          positionY: 200,
        },
      ],
      edges: [],
    });

    assert.ok(result);
    assert.equal(result!.steps.length, 1);
    assert.notEqual(result!.steps[0].id, tempStepId);
    assert.equal(result!.steps[0].positionX, 100);
  });
});
