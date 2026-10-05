import type { HTMLAttributes, ReactNode } from "react";
import PageFrame from "./PageFrame";
import { cn } from "../../lib/utils";

export interface WorkspaceShellProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Fill remaining viewport below topbar (templates / flow editors). */
  fillViewport?: boolean;
}

/**
 * Full-height workspace for admin templates and workflow editors — command chrome + canvas.
 */
export default function WorkspaceShell({
  children,
  fillViewport = false,
  className,
  ...rest
}: WorkspaceShellProps) {
  return (
    <PageFrame
      width="wide"
      className={cn("workspace-shell", fillViewport && "workspace-shell--fill", className)}
      {...rest}
    >
      {children}
    </PageFrame>
  );
}
