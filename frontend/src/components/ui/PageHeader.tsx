import type { ReactNode } from "react";
import KreoPageHeader from "@/components/molecules/PageHeader";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  variant?: "default" | "command";
}

export default function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  meta,
  variant = "default",
}: PageHeaderProps) {
  return (
    <KreoPageHeader
      variant={variant}
      title={title}
      description={
        subtitle || meta ? (
          <>
            {subtitle}
            {meta ? <div className="mt-2">{meta}</div> : null}
          </>
        ) : undefined
      }
      breadcrumbs={eyebrow}
      actions={actions}
    />
  );
}
