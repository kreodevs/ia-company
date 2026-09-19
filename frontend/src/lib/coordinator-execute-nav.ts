export type CoordinatorExecuteRedirect = "auto" | "war-room" | "trabajo" | "encargo" | "none";

export interface CoordinatorExecuteNavInput {
  runId: string;
  productId?: string | null;
  resultProductId?: string | null;
  redirect?: CoordinatorExecuteRedirect;
}

export function resolveCoordinatorExecutePath({
  runId,
  productId,
  resultProductId,
  redirect = "auto",
}: CoordinatorExecuteNavInput): string | null {
  if (redirect === "none") return null;

  const runQuery = `run=${encodeURIComponent(runId)}`;
  const warProductId = productId || resultProductId || undefined;

  if (redirect === "war-room") {
    return warProductId ? `/war-room/${warProductId}?${runQuery}` : `/war-room?${runQuery}`;
  }

  if (redirect === "trabajo") {
    return `/office/trabajo?tab=activos&${runQuery}`;
  }

  if (redirect === "encargo") {
    return `/office/encargos/${runId}`;
  }

  // auto — product war room; general encargos stay in trabajo hub
  if (warProductId) {
    return `/war-room/${warProductId}?${runQuery}`;
  }
  return `/office/trabajo?tab=activos&${runQuery}`;
}
