import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";

export interface OfficeActionCardLinkProps {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
  metric?: number;
  attention?: boolean;
}

export default function OfficeActionCardLink({
  to,
  icon: Icon,
  title,
  description,
  metric,
  attention = false,
}: OfficeActionCardLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        "office-home-action-card interactive",
        attention && "office-home-action-card--attention",
      )}
    >
      <Icon className="office-home-action-icon" aria-hidden />
      <span className="office-home-action-body">
        <span className="office-home-action-title">{title}</span>
        <span className="office-home-action-desc">{description}</span>
      </span>
      {metric != null && metric > 0 ? (
        <span className="office-home-action-metric tabular-nums">{metric}</span>
      ) : null}
    </Link>
  );
}
