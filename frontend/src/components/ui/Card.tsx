import type { ReactNode } from "react";
import KreoCard from "@/components/molecules/Card";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md";
  tint?: string;
}

export default function Card({ children, className = "", padding = "md" }: CardProps) {
  const paddingClass =
    padding === "none"
      ? "[&>div:last-child]:p-0"
      : padding === "sm"
        ? "[&>div:last-child]:px-3 [&>div:last-child]:py-2"
        : "";

  return (
    <KreoCard className={cn(paddingClass, className)}>
      {children}
    </KreoCard>
  );
}
