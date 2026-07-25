import type { ComponentProps } from "react";
import KreoStatusPill from "@/components/atoms/StatusPill";

export type KreoStatus = NonNullable<ComponentProps<typeof KreoStatusPill>["status"]>;

const STATUS_ALIASES: Record<string, KreoStatus> = {
  completed: "success",
  success: "success",
  approved: "success",
  active: "success",
  running: "info",
  pending: "warning",
  delegated: "info",
  thinking: "info",
  queued: "warning",
  failed: "error",
  error: "error",
  rejected: "error",
  cancelled: "neutral",
  paused: "neutral",
  idle: "neutral",
  standby: "neutral",
  awaiting_user: "warning",
  warning: "warning",
  veto: "warning",
  discovery: "info",
  build: "info",
  launch: "success",
  growth: "success",
  sunset: "neutral",
};

export function mapDomainStatusToKreo(status: string): KreoStatus {
  const normalized = status.toLowerCase().replace(/[^a-z0-9_]+/g, "_");
  return STATUS_ALIASES[normalized] ?? "neutral";
}
