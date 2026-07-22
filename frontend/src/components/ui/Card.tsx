import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md";
}

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
};

export default function Card({ children, className = "", padding = "md" }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
