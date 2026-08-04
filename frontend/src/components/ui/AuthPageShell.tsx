import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuthPageShellProps {
  children: ReactNode;
  className?: string;
}

/** Centered layout for login, setup, and password recovery screens. */
export default function AuthPageShell({ children, className }: AuthPageShellProps) {
  return (
    <div className={cn("auth-page", className)}>
      <div className="auth-page-inner">{children}</div>
    </div>
  );
}
