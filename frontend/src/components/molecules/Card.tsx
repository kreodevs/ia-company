import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CardTint = "none" | "peach" | "mint" | "lavender" | "mist";

const tintClasses: Record<CardTint, string> = {
  none: "bg-[var(--card)] border-[var(--card-border)]",
  peach: "bg-[var(--color-peach-wall)] border-transparent",
  mint: "bg-[var(--color-mint-wall)] border-transparent",
  lavender: "bg-[var(--color-lavender-wall)] border-transparent",
  mist: "bg-[var(--color-mist-white)] border-[var(--color-hairline)]",
};

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
  tint?: CardTint;
  padding?: "none" | "sm" | "md";
}

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-[var(--card-padding)]",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ title, subtitle, footer, tint = "none", padding = "md", className, children, ...props }, ref) => {
    const hasHeader = Boolean(title || subtitle);
    const bodyPadding = hasHeader || footer ? paddingClasses[padding] : paddingClasses[padding];

    return (
      <div
        ref={ref}
        className={cn(
          "overflow-hidden rounded-[var(--radius-cards)] border",
          tintClasses[tint],
          className,
        )}
        {...props}
      >
        {hasHeader ? (
          <div className={cn("border-b border-[var(--color-hairline)]", paddingClasses[padding])}>
            {title ? (
              <h3 className="font-[family-name:var(--font-albra-sans)] text-[length:var(--text-subheading)] font-semibold leading-[var(--leading-subheading)] tracking-[var(--tracking-subheading)] text-[var(--foreground)]">
                {title}
              </h3>
            ) : null}
            {subtitle ? (
              <p className="mt-1 text-sm text-[var(--foreground-muted)]">{subtitle}</p>
            ) : null}
          </div>
        ) : null}
        {children ? <div className={bodyPadding}>{children}</div> : null}
        {footer ? (
          <div className={cn("border-t border-[var(--color-hairline)]", paddingClasses[padding])}>
            {footer}
          </div>
        ) : null}
      </div>
    );
  },
);

Card.displayName = "Card";

export const CardHeader = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("border-b border-[var(--color-hairline)] p-[var(--card-padding)]", className)}>
    {children}
  </div>
);

export const CardContent = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("p-[var(--card-padding)]", className)}>{children}</div>
);

export const CardFooter = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("border-t border-[var(--color-hairline)] p-[var(--card-padding)]", className)}>
    {children}
  </div>
);

export const CardTitle = ({ children, className }: { children: ReactNode; className?: string }) => (
  <h3
    className={cn(
      "font-[family-name:var(--font-albra-sans)] text-[length:var(--text-subheading)] font-semibold leading-[var(--leading-subheading)] tracking-[var(--tracking-subheading)] text-[var(--foreground)]",
      className,
    )}
  >
    {children}
  </h3>
);

export const CardDescription = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={cn("text-sm text-[var(--foreground-muted)]", className)}>{children}</p>
);

export default Card;
