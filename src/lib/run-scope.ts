import type { Prisma } from "@prisma/client";
import { readMemoryOrgUnitId } from "./office-run-department.js";
import { extractRunProductMemory } from "./product-run-association.js";

export function resolveRunScopeFields(input: {
  sharedMemory?: unknown;
  productId?: string | null;
  orgUnitId?: string | null;
}): { orgUnitId: string | null; productId: string | null } {
  const memory = input.sharedMemory ?? {};
  const fromMemory = extractRunProductMemory(memory);
  const orgUnitId = input.orgUnitId ?? readMemoryOrgUnitId(memory);
  const productId = input.productId ?? fromMemory.productId;
  return { orgUnitId, productId };
}

export function executionRunCreateData(input: {
  workflowId: string;
  tenantId?: string | null;
  sharedMemory?: unknown;
  productId?: string | null;
  orgUnitId?: string | null;
  status?: Prisma.ExecutionRunCreateInput["status"];
}): Prisma.ExecutionRunUncheckedCreateInput {
  const sharedMemory = (input.sharedMemory ?? {}) as object;
  const scope = resolveRunScopeFields({
    sharedMemory,
    productId: input.productId,
    orgUnitId: input.orgUnitId,
  });
  return {
    workflowId: input.workflowId,
    tenantId: input.tenantId ?? undefined,
    status: input.status ?? "PENDING",
    sharedMemory,
    orgUnitId: scope.orgUnitId,
    productId: scope.productId,
  };
}
