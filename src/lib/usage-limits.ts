import type { ExecutionStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { sendRunNotificationEmail } from "./email.js";

export class UsageLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageLimitError";
  }
}

function startOfMonth(): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function assertTenantCanExecute(tenantId: string): Promise<void> {
  const limits = await prisma.tenantUsageLimits.findUnique({ where: { tenantId } });
  if (!limits) return;

  const since = startOfMonth();
  const [runCount, aggregates] = await Promise.all([
    prisma.executionRun.count({ where: { tenantId, createdAt: { gte: since } } }),
    prisma.executionRun.aggregate({
      where: { tenantId, createdAt: { gte: since } },
      _sum: { totalTokens: true, totalCostUsd: true },
    }),
  ]);

  if (limits.maxRunsPerMonth != null && runCount >= limits.maxRunsPerMonth) {
    throw new UsageLimitError(
      `Monthly run limit reached (${limits.maxRunsPerMonth} runs)`,
    );
  }

  const totalCost = aggregates._sum.totalCostUsd ?? 0;
  if (limits.maxCostUsdPerMonth != null && totalCost >= limits.maxCostUsdPerMonth) {
    throw new UsageLimitError(
      `Monthly cost limit reached ($${limits.maxCostUsdPerMonth.toFixed(2)} USD)`,
    );
  }

  const totalTokens = aggregates._sum.totalTokens ?? 0;
  if (limits.maxTokensPerMonth != null && totalTokens >= limits.maxTokensPerMonth) {
    throw new UsageLimitError(
      `Monthly token limit reached (${limits.maxTokensPerMonth.toLocaleString()} tokens)`,
    );
  }
}

export async function getTenantMonthlyUsage(tenantId: string) {
  const since = startOfMonth();
  const [runCount, aggregates, limits] = await Promise.all([
    prisma.executionRun.count({ where: { tenantId, createdAt: { gte: since } } }),
    prisma.executionRun.aggregate({
      where: { tenantId, createdAt: { gte: since } },
      _sum: { totalTokens: true, totalCostUsd: true },
    }),
    prisma.tenantUsageLimits.findUnique({ where: { tenantId } }),
  ]);

  return {
    periodStart: since.toISOString(),
    runs: runCount,
    totalTokens: aggregates._sum.totalTokens ?? 0,
    totalCostUsd: aggregates._sum.totalCostUsd ?? 0,
    limits: limits ?? {
      maxRunsPerMonth: null,
      maxCostUsdPerMonth: null,
      maxTokensPerMonth: null,
    },
  };
}

export async function notifyRunFinished(params: {
  tenantId: string;
  runId: string;
  status: ExecutionStatus;
  workflowName: string;
  totalCostUsd: number;
  totalTokens: number;
  errorMessage?: string | null;
}): Promise<void> {
  const config = await prisma.tenantNotificationConfig.findUnique({
    where: { tenantId: params.tenantId },
  });
  if (!config) return;

  const notify =
    (params.status === "COMPLETED" && config.notifyOnComplete) ||
    (params.status === "FAILED" && config.notifyOnFail);
  if (!notify) return;

  const payload = {
    event: "workflow.run.finished",
    runId: params.runId,
    status: params.status,
    workflowName: params.workflowName,
    totalCostUsd: params.totalCostUsd,
    totalTokens: params.totalTokens,
    errorMessage: params.errorMessage ?? null,
    timestamp: new Date().toISOString(),
  };

  const tasks: Promise<unknown>[] = [];

  if (config.webhookUrl) {
    tasks.push(
      fetch(config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch((err) => console.warn("[notify] webhook failed:", err)),
    );
  }

  if (config.slackWebhookUrl) {
    const emoji = params.status === "COMPLETED" ? "✅" : "❌";
    tasks.push(
      fetch(config.slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `${emoji} *${params.workflowName}* — ${params.status}\nRun \`${params.runId}\` · $${params.totalCostUsd.toFixed(4)} · ${params.totalTokens} tokens`,
        }),
      }).catch((err) => console.warn("[notify] slack failed:", err)),
    );
  }

  if (config.emailRecipients) {
    const recipients = config.emailRecipients
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    tasks.push(
      sendRunNotificationEmail({
        to: recipients,
        subject: `[Auto-Company] ${params.workflowName} — ${params.status}`,
        html: `<p>Workflow <strong>${params.workflowName}</strong> finished with status <strong>${params.status}</strong>.</p>
               <ul><li>Run ID: ${params.runId}</li><li>Cost: $${params.totalCostUsd.toFixed(4)}</li><li>Tokens: ${params.totalTokens}</li></ul>
               ${params.errorMessage ? `<p>Error: ${params.errorMessage}</p>` : ""}`,
      }),
    );
  }

  await Promise.all(tasks);
}
