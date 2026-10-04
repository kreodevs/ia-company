import { Link } from "react-router-dom";
import { ArrowLeftRight, Building2, ChevronRight, ShieldAlert, Users } from "lucide-react";
import { Card } from "@/components/molecules/Card";
import StatusPill from "@/components/ui/StatusPill";
import { Button } from "@/components/atoms/Button";
import type { OrganigramNode } from "../../lib/api";
import { cn } from "@/lib/utils";

export interface DepartmentOrgCardProps {
  node: OrganigramNode;
  depth?: number;
  roomStatus?: "idle" | "busy";
  agentCount?: number;
  className?: string;
}

/**
 * Fase E — tarjeta de departamento en el organigrama (Kreo Card + enlaces accionables).
 */
export function DepartmentOrgCard({
  node,
  depth = 0,
  roomStatus,
  agentCount,
  className,
}: DepartmentOrgCardProps) {
  const deptPath = `/office/departments/${encodeURIComponent(node.slug)}`;
  const encargosPath = `/office/trabajo?departmentSlug=${encodeURIComponent(node.slug)}`;

  return (
    <Card
      className={cn("department-org-card", className)}
      title={
        <span className="inline-flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[var(--primary)]" aria-hidden />
          {node.name}
        </span>
      }
      subtitle={
        <span className="inline-flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-[var(--foreground-muted)]">{node.type}</span>
          {roomStatus && (
            <StatusPill status={roomStatus === "busy" ? "running" : "completed"}>
              {roomStatus === "busy" ? "Activo" : "En reposo"}
            </StatusPill>
          )}
        </span>
      }
      footer={
        <div className="flex flex-wrap gap-2 border-t border-[var(--border)] px-[var(--spacing-md)] py-[var(--spacing-sm)]">
          <Button variant="outline" size="sm" asChild>
            <Link to={deptPath}>Abrir sala</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to={encargosPath}>
              Trabajos
              <ChevronRight className="ml-1 h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
      }
    >
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[var(--foreground-muted)]">Trabajos dept.</dt>
          <dd className="font-semibold tabular-nums">{node.workItemCount}</dd>
        </div>
        <div>
          <dt className="text-[var(--foreground-muted)]">Subunidades</dt>
          <dd className="font-semibold tabular-nums">{node.children.length}</dd>
        </div>
        <div>
          <dt className="inline-flex items-center gap-1 text-[var(--foreground-muted)]">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
            Bloqueados
          </dt>
          <dd className="font-semibold tabular-nums">
            {node.blockedWorkItems > 0 ? (
              <Link to="/office/inbox?category=blocked" className="text-[var(--primary)] hover:underline">
                {node.blockedWorkItems}
              </Link>
            ) : (
              0
            )}
          </dd>
        </div>
        <div>
          <dt className="inline-flex items-center gap-1 text-[var(--foreground-muted)]">
            <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />
            Handoffs
          </dt>
          <dd className="font-semibold tabular-nums text-sm">
            <span title="Entrantes">{node.pendingHandoffsIn} in</span>
            <span className="mx-1 text-[var(--foreground-muted)]">/</span>
            <span title="Salientes">{node.pendingHandoffsOut} out</span>
          </dd>
        </div>
        {agentCount !== undefined && (
          <div className="col-span-2 flex items-center gap-1.5 text-[var(--foreground-muted)]">
            <Users className="h-3.5 w-3.5" aria-hidden />
            <span>{agentCount} especialistas en sala</span>
          </div>
        )}
      </dl>
      {node.children.length > 0 && (
        <div
          className="mt-4 space-y-3 border-l-2 border-[var(--border)] pl-4"
          style={{ marginLeft: depth > 0 ? 0 : undefined }}
        >
          {node.children.map((child) => (
            <DepartmentOrgCard key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </Card>
  );
}
