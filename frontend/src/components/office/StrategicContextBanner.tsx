import { Link } from "react-router-dom";
import { Target } from "lucide-react";
import { Card } from "@/components/molecules/Card";
import { cn } from "@/lib/utils";

export interface StrategicContextBannerProps {
  companyGoalId?: string | null;
  companyGoalName?: string | null;
  initiativeId?: string | null;
  initiativeName?: string | null;
  className?: string;
}

/**
 * Fase F — contexto estratégico visible (objetivo / iniciativa) con enlaces Kreo Card.
 */
export function StrategicContextBanner({
  companyGoalId,
  companyGoalName,
  initiativeId,
  initiativeName,
  className,
}: StrategicContextBannerProps) {
  if (!companyGoalName && !initiativeName) return null;

  return (
    <Card
      className={cn("strategic-context-banner border-[var(--primary)]/25 bg-[var(--surface-elevated)]", className)}
      title={
        <span className="inline-flex items-center gap-2 text-sm font-medium">
          <Target className="h-4 w-4 text-[var(--primary)]" aria-hidden />
          Contexto estratégico
        </span>
      }
    >
      <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {companyGoalName ? (
          <div>
            <dt className="text-[var(--foreground-muted)]">Objetivo</dt>
            <dd className="font-medium">
              {companyGoalId ? (
                <Link to={`/office/objetivos/${companyGoalId}`} className="text-[var(--primary)] hover:underline">
                  {companyGoalName}
                </Link>
              ) : (
                companyGoalName
              )}
            </dd>
          </div>
        ) : null}
        {initiativeName ? (
          <div>
            <dt className="text-[var(--foreground-muted)]">Iniciativa</dt>
            <dd className="font-medium">
              {initiativeId && companyGoalId ? (
                <Link
                  to={`/office/trabajo?tab=todos&companyGoalId=${companyGoalId}&initiativeId=${initiativeId}`}
                  className="text-[var(--primary)] hover:underline"
                >
                  {initiativeName}
                </Link>
              ) : (
                <Link to="/office/iniciativas" className="text-[var(--primary)] hover:underline">
                  {initiativeName}
                </Link>
              )}
            </dd>
          </div>
        ) : null}
      </dl>
    </Card>
  );
}
