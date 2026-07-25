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
  errorMessage?: string | null;
}

export default function StatusBadge({ status, label, errorMessage }: StatusBadgeProps) {
  const mapped =
    errorMessage?.startsWith("VETO:") ? "warning" : (statusMap[status] ?? "neutral");
  return <StatusPill status={mapped}>{label}</StatusPill>;
}
