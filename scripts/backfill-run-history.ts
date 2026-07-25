/**
 * Backfill empty _history on completed runs from execution logs.
 * Usage: npx tsx scripts/backfill-run-history.ts [--tenant-id=...] [--dry-run]
 */
import { prisma } from "../src/lib/prisma.js";
import type { SharedMemory } from "../src/types/index.js";

const dryRun = process.argv.includes("--dry-run");
const tenantArg = process.argv.find((a) => a.startsWith("--tenant-id="));
const tenantFilter = tenantArg?.split("=")[1];

async function main() {
  const runs = await prisma.executionRun.findMany({
    where: {
      status: { in: ["COMPLETED", "FAILED", "CANCELLED"] },
      ...(tenantFilter ? { tenantId: tenantFilter } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      logs: {
        where: { message: { startsWith: "Completed step:" } },
        orderBy: { createdAt: "asc" },
        select: {
          message: true,
          agentId: true,
          stepId: true,
          createdAt: true,
          payload: true,
        },
      },
      workflow: { select: { name: true } },
    },
  });

  let updated = 0;
  for (const run of runs) {
    const memory = (run.sharedMemory ?? {}) as SharedMemory;
    const history = Array.isArray(memory._history) ? memory._history : [];
    if (history.length > 0) continue;

    const agents = await prisma.agent.findMany({
      where: { tenantId: run.tenantId },
      select: { id: true, name: true },
    });
    const agentNameById = new Map(agents.map((a) => [a.id, a.name]));

    const rebuilt = run.logs.map((log, i) => {
      const agentName =
        (log.agentId ? agentNameById.get(log.agentId) : null) ??
        log.message.replace(/^Completed step:\s*/, "").trim();
      const payload = log.payload as { outputLength?: number } | null;
      return {
        stepId: log.stepId ?? undefined,
        agentName,
        output: "",
        timestamp: log.createdAt.toISOString(),
        stepOrder: i + 1,
        ...(payload?.outputLength ? { outputLength: payload.outputLength } : {}),
      };
    });

    if (rebuilt.length === 0) continue;

    const nextMemory = { ...memory, _history: rebuilt };
    if (!dryRun) {
      await prisma.executionRun.update({
        where: { id: run.id },
        data: { sharedMemory: nextMemory as object },
      });
    }
    updated += 1;
    console.log(`${dryRun ? "[dry-run] " : ""}backfilled ${run.id} (${run.workflow.name}) steps=${rebuilt.length}`);
  }

  console.log(`Done. ${updated} run(s) ${dryRun ? "would be " : ""}updated.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
