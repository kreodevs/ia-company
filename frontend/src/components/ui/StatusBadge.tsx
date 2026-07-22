import StatusPill from "@/components/atoms/StatusPill";

const statusMap: Record<string, "success" | "warning" | "error" | "info" | "neutral" | "running"> = {
  PENDING: "warning",
  RUNNING: "running",
  DELEGATED: "info",
  AWAITING_USER: "warning",
  COMPLETED: "success",
  FAILED: "error",
  CANCELLED: "neutral",
};

interface StatusBadgeProps {
  status: string;
  label: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  return <StatusPill status={statusMap[status] ?? "neutral"}>{label}</StatusPill>;
}
