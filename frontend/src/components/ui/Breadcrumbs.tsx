import type { ReactNode } from "react";
import KreoBreadcrumb from "@/components/atoms/Breadcrumb";

export interface Crumb {
  label: ReactNode;
  to?: string;
}

export interface BreadcrumbsProps {
  items: Crumb[];
  className?: string;
}

export default function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <KreoBreadcrumb
      className={className}
      items={items.map((item) => ({
        label: String(item.label),
        to: item.to,
      }))}
    />
  );
}
