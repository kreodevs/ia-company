import { useTranslation } from "react-i18next";

interface WarRoomVetoBannerProps {
  message: string;
  className?: string;
}

export default function WarRoomVetoBanner({ message, className = "" }: WarRoomVetoBannerProps) {
  const { t } = useTranslation();
  return (
    <div className={`mb-4 app-alert app-alert--warning ${className}`.trim()} role="status">
      <strong>{t("warRoom.vetoTitle", { defaultValue: "Munger veto — run stopped" })}</strong>
      <p className="mt-1">{message.replace(/^VETO:\s*/, "")}</p>
    </div>
  );
}

export function resolveWarRoomVetoMessage(
  activeRun: { errorMessage?: string | null } | null | undefined,
  recentRuns: Array<{ errorMessage?: string | null }>,
): string | null {
  if (activeRun?.errorMessage?.startsWith("VETO:")) return activeRun.errorMessage;
  const recent = recentRuns.find((run) => run.errorMessage?.startsWith("VETO:"));
  return recent?.errorMessage ?? null;
}
