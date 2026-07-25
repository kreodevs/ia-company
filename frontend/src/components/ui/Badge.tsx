import type { ReactNode } from "react";
import KreoBadge from "@/components/atoms/Badge";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "primary";
}

export default function Badge({ children, variant = "default" }: BadgeProps) {
  return <KreoBadge variant={variant === "primary" ? "default" : "secondary"}>{children}</KreoBadge>;
}
