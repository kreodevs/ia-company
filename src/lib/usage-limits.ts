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

  await dispatchTenantNotification(config, {
    event: "workflow.run.finished",
    runId: params.runId,
    status: params.status,
    workflowName: params.workflowName,
    totalCostUsd: params.totalCostUsd,
    totalTokens: params.totalTokens,
    errorMessage: params.errorMessage ?? null,
    timestamp: new Date().toISOString(),
  });
}

export async function notifyOpencodeGateRequired(params: {
  tenantId: string;
  runId: string;
  workflowName: string;
}): Promise<void> {
  const config = await prisma.tenantNotificationConfig.findUnique({
    where: { tenantId: params.tenantId },
  });
  if (!config) return;

  await dispatchTenantNotification(config, {
    event: "opencode.gate.required",
    runId: params.runId,
    workflowName: params.workflowName,
    message:
      "OpenCode is not configured. Choose whether to continue with local Auto-Company coding or cancel the run.",
    timestamp: new Date().toISOString(),
  });
}

export async function notifyOpencodeDelegationCompleted(params: {
  tenantId: string;
  runId: string;
  workflowName: string;
  diffCount: number;
  resultSummary: string;
}): Promise<void> {
  const config = await prisma.tenantNotificationConfig.findUnique({
    where: { tenantId: params.tenantId },
  });
  if (!config?.notifyOnComplete) return;

  await dispatchTenantNotification(config, {
    event: "opencode.delegation.completed",
    runId: params.runId,
    workflowName: params.workflowName,
    diffCount: params.diffCount,
    summary: params.resultSummary.slice(0, 2000),
    message: `OpenCode finished with ${params.diffCount} file change(s). Workflow will resume locally.`,
    timestamp: new Date().toISOString(),
  });
}

async function dispatchTenantNotification(
  config: {
    webhookUrl: string | null;
    slackWebhookUrl: string | null;
    emailRecipients: string | null;
  },
  payload: Record<string, unknown>,
): Promise<void> {
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
    const event = String(payload.event ?? "notification");
    const workflowName = String(payload.workflowName ?? "workflow");
    const runId = String(payload.runId ?? "");
    const status = String(payload.status ?? event);
    const emoji = status.includes("fail") || status.includes("cancel") ? "❌" : "⚠️";
    tasks.push(
      fetch(config.slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `${emoji} *${workflowName}* — ${status}\nRun \`${runId}\`\n${payload.message ?? ""}`,
        }),
      }).catch((err) => console.warn("[notify] slack failed:", err)),
    );
  }

  if (config.emailRecipients) {
    const recipients = config.emailRecipients
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    const subject = `[Auto-Company] ${payload.workflowName ?? "Workflow"} — ${payload.event ?? "notification"}`;
    tasks.push(
      sendRunNotificationEmail({
        to: recipients,
        subject,
        html: `<p>${payload.message ?? "Notification from Auto-Company"}</p>
               <ul><li>Run ID: ${payload.runId ?? ""}</li><li>Workflow: ${payload.workflowName ?? ""}</li></ul>`,
      }),
    );
  }

  await Promise.all(tasks);
}
