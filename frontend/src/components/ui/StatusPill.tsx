import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

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
    <span className={cn("status-pill", `status-pill--${normalized}`, className)}>
      {label}
    </span>
  );
}