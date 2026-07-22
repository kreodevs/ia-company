import type { ReactNode } from "react";
import KreoCard, { type CardTint } from "@/components/molecules/Card";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md";
  tint?: CardTint;
}

export default function Card({ children, className = "", padding = "md", tint = "none" }: CardProps) {
  return (
    <KreoCard padding={padding} tint={tint} className={className}>
      {children}
    </KreoCard>
  );
}
