import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}

export default function PageHeader({ title, subtitle, eyebrow, actions, meta }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <div className="mb-1 text-sm text-[var(--color-muted-foreground)]">{eyebrow}</div>
        ) : null}
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle ? (
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-[var(--color-muted-foreground)]">
            {subtitle}
          </p>
        ) : null}
        {meta ? <div className="mt-2">{meta}</div> : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
