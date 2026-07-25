import type { ArtifactType } from "@prisma/client";
import { prisma } from "./prisma.js";
import { createArtifact } from "./artifact.js";
import { PLATFORM_BUSINESS_TEMPLATES } from "./business-templates.js";
import type { BusinessTemplateDefinition } from "./org-os-types.js";

const DEFAULT_AGENT_ARTIFACT: Record<string, ArtifactType> = {
  "copy-manager": "copy",
  "community-manager": "social_post",
  "design-lead": "design",
  "marketing-strategist": "report",
  "marketing-godin": "report",
  "fullstack-dhh": "code",
};

async function resolveArtifactType(
  tenantId: string,
  orgUnitId: string,
  agentName: string,
): Promise<ArtifactType> {
  const org = await prisma.orgUnit.findFirst({
    where: { id: orgUnitId, tenantId },
    include: { template: true },
  });

  const definitions: BusinessTemplateDefinition[] = [];
  if (org?.template?.definition) {
    definitions.push(org.template.definition as unknown as BusinessTemplateDefinition);
  }
  const bundled = PLATFORM_BUSINESS_TEMPLATES.find((t) => t.orgUnitType === org?.type);
  if (bundled) definitions.push(bundled.definition);

  for (const def of definitions) {
    const agent = def.suggestedAgents?.find((a) => a.name === agentName);
    const mapped = agent?.artifactTypes?.[0];
    if (mapped) return mapped as ArtifactType;
  }

  return DEFAULT_AGENT_ARTIFACT[agentName] ?? "other";
}

function artifactTitle(agentName: string, workflowName: string, stepOrder?: number): string {
  const suffix = stepOrder != null ? ` · step ${stepOrder}` : "";
  return `${agentName} — ${workflowName}${suffix}`;
}

export async function persistHandoffAsArtifact(input: {
  tenantId: string;
  orgUnitId: string;
  productId?: string;
  runId: string;
  agentName: string;
  content: string;
  workflowName: string;
  stepOrder?: number;
}) {
  const content = input.content.trim();
  if (!content) return null;

  const type = await resolveArtifactType(input.tenantId, input.orgUnitId, input.agentName);

  return createArtifact(input.tenantId, {
    orgUnitId: input.orgUnitId,
    productId: input.productId,
    runId: input.runId,
    type,
    title: artifactTitle(input.agentName, input.workflowName, input.stepOrder),
    body: {
      content,
      workflowName: input.workflowName,
      stepOrder: input.stepOrder ?? null,
      agentName: input.agentName,
    },
    previewText: content.slice(0, 500),
    createdByAgent: input.agentName,
  });
}

export async function persistOrgUnitHandoffsFromRun(input: {
  tenantId: string;
  productId: string;
  orgUnitId: string;
  runId: string;
  workflowName: string;
  history: Array<{
    agentName?: string;
    output?: string;
    stepOrder?: number;
    wroteDocs?: boolean;
    savedDeliverablePath?: string;
  }>;
}) {
  let created = 0;
  for (let i = 0; i < input.history.length; i++) {
    const step = input.history[i];
    if (!step?.agentName) continue;
    const output =
      typeof step.output === "string" && step.output.trim() ? step.output.trim() : "";
    if (!output) continue;

    await persistHandoffAsArtifact({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      productId: input.productId,
      runId: input.runId,
      agentName: step.agentName,
      content: output,
      workflowName: input.workflowName,
      stepOrder: step.stepOrder ?? i + 1,
    });
    created += 1;
  }
  return created;
}
