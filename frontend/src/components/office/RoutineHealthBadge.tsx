import StatusPill from "../ui/StatusPill";
import type { DepartmentOperationHealth } from "../../lib/api";

const LABEL: Record<DepartmentOperationHealth, string> = {
  healthy: "En marcha",
  warning: "Atención",
  paused: "Pausada",
  disabled: "Desactivada",
};

const STATUS: Record<DepartmentOperationHealth, "completed" | "running" | "pending" | "failed"> = {
  healthy: "completed",
  warning: "running",
  paused: "pending",
  disabled: "failed",
};

export function RoutineHealthBadge({ health }: { health: DepartmentOperationHealth }) {
  return <StatusPill status={STATUS[health]}>{LABEL[health]}</StatusPill>;
}
