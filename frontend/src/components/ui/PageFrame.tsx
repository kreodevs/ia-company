import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

export type PageFrameWidth = "narrow" | "default" | "wide" | "office" | "fluid";

export interface PageFrameProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  width?: PageFrameWidth;
}

/**
 * Consistent page column inside `page-shell` — one max-width + vertical rhythm.
 */
export default function PageFrame({
  children,
  width = "default",
  className,
  ...rest
}: PageFrameProps) {
  return (
    <div className={cn("page-frame", `page-frame--${width}`, className)} {...rest}>
      {children}
    </div>
  );
}
