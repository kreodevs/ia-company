import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import KreoStatusPill from "@/components/atoms/StatusPill";
import { cn } from "@/lib/utils";
import { mapDomainStatusToKreo } from "./kreo-status-map";

export interface StatusPillProps {
  status: string;
  children?: ReactNode;
  className?: string;
}

export default function StatusPill({ status, children, className }: StatusPillProps) {
  const { t } = useTranslation();
  const normalized = status.toLowerCase();
  const label = children ?? t(`status.${normalized}`, { defaultValue: status });

  return (
    <KreoStatusPill status={mapDomainStatusToKreo(status)} className={cn(className)}>
      {label}
    </KreoStatusPill>
  );
}
