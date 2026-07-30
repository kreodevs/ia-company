import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type TenantProduct } from "../../lib/api";
import { AGENT_EMOJI, agentDisplayLabel, avatarGradient } from "../../lib/office-visual";
import CoordinatorChat from "./CoordinatorChat";
import Select from "../ui/Select";

export const DEPARTMENT_SCOPE_GENERAL = "__general__";

export interface DepartmentRoomAgent {
  id: string;
  name: string;
  role?: string | null;
  status: "idle" | "busy";
  provisioned?: boolean;
}

export interface DepartmentRoomViewProps {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle: string;
  emoji?: string;
  status: "idle" | "busy";
  agentNames: string[];
  agents: DepartmentRoomAgent[];
  activeEncargoHref?: string | null;
  orgUnitId?: string;
  linkedProductIds?: string[];
  headerActions?: ReactNode;
  sidebarFooter?: ReactNode;
  children?: ReactNode;
}

function positionOnCircle(index: number, total: number, radiusPct: number): { x: number; y: number } {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  return {
    x: 50 + Math.cos(angle) * radiusPct,
    y: 50 + Math.sin(angle) * radiusPct,
  };
}

export default function DepartmentRoomView({
  backHref,
  backLabel,
  title,
  subtitle,
  emoji = "🏢",
  status,
  agentNames,
  agents,
  activeEncargoHref,
  orgUnitId,
  linkedProductIds,
  headerActions,
  sidebarFooter,
  children,
}: DepartmentRoomViewProps) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<TenantProduct[]>([]);
  const [focusProductId, setFocusProductId] = useState<string | null>(null);
  const [productScope, setProductScope] = useState(DEPARTMENT_SCOPE_GENERAL);

  useEffect(() => {
    api.products
      .overview()
      .then((overview) => {
        setProducts(overview.products);
        setFocusProductId(overview.focusProduct?.id ?? null);
      })
      .catch(() => undefined);
  }, []);

  const scopeProducts = useMemo(() => {
    if (!linkedProductIds?.length) return products;
    const linked = new Set(linkedProductIds);
    return products.filter((product) => linked.has(product.id));
  }, [products, linkedProductIds]);

  const selectedProduct = useMemo(
    () => scopeProducts.find((product) => product.id === productScope) ?? null,
    [scopeProducts, productScope],
  );

  const scopeHint =
    productScope === DEPARTMENT_SCOPE_GENERAL
      ? t("office.task.scopeCompanyHint")
      : selectedProduct
        ? t("office.task.scopeProductHint", { name: selectedProduct.name })
        : orgUnitId
          ? t("office.task.scopeOrgHint", { name: title })
          : null;

  const scopeOptions = useMemo(
    () => [
      {
        value: DEPARTMENT_SCOPE_GENERAL,
        label: t("office.task.scopeCompany"),
      },
      ...scopeProducts.map((product) => ({
        value: product.id,
        label:
          product.id === focusProductId
            ? `${product.name} (${t("warRoom.focused")})`
            : product.name,
      })),
    ],
    [scopeProducts, focusProductId, t],
  );

  const seats = agentNames.map((name) => {
    const agent = agents.find((a) => a.name === name);
    return {
      id: agent?.id ?? name,
      name,
      role: agent?.role ?? null,
      status: agent?.status ?? ("idle" as const),
      provisioned: agent?.provisioned ?? Boolean(agent?.id && agent.id !== name),
    };
  });

  const provisionedCount = seats.filter((seat) => seat.provisioned).length;

  return (
    <div className="office-dept-page">
      <header className="office-dept-header">
        <Link to={backHref} className="office-dept-back">
          ← {backLabel}
        </Link>
        <div className="office-dept-title-row">
          <span className="office-dept-emoji" aria-hidden>
            {emoji}
          </span>
          <div>
            <h1 className="office-dept-title">{title}</h1>
            <p className="office-dept-subtitle">{subtitle}</p>
          </div>
          <span className="office-dept-status-pill" data-status={status}>
            {status === "busy" ? t("office.agents.busy") : t("office.agents.idle")}
          </span>
          {headerActions ? <div className="office-dept-header-actions">{headerActions}</div> : null}
        </div>
      </header>

      <div className="office-dept-scope-bar">
        <label htmlFor="office-dept-scope" className="office-dept-scope-label">
          {t("office.task.scope")}
        </label>
        <Select
          id="office-dept-scope"
          value={productScope}
          onChange={setProductScope}
          options={scopeOptions}
          ariaLabel={t("office.task.scope")}
          className="office-dept-scope-select"
          size="sm"
        />
        {scopeHint ? <p className="office-dept-scope-hint">{scopeHint}</p> : null}
      </div>

      <div className="office-dept-grid">
        <section className="office-dept-war-room">
          <h2 className="office-panel-title">{t("office.floor.meetingRoom")}</h2>
          {agentNames.length > 0 && provisionedCount < agentNames.length ? (
            <p className="office-dept-roster-hint">
              {t("office.floor.rosterHint", {
                active: provisionedCount,
                total: agentNames.length,
              })}
            </p>
          ) : null}
          {seats.length === 0 ? (
            <p className="office-empty">{t("office.floor.noSpecialists")}</p>
          ) : (
            <div className="office-dept-table">
              <div className="office-dept-table-core" aria-hidden />
              {seats.map((agent, index) => {
                const { x, y } = positionOnCircle(index, Math.max(seats.length, 1), 38);
                return (
                  <div
                    key={agent.id}
                    className={`office-dept-seat office-dept-seat-${agent.status}`}
                    style={{ left: `${x}%`, top: `${y}%` }}
                  >
                    <div
                      className="office-dept-seat-avatar"
                      style={{ background: avatarGradient(agent.name) }}
                      data-pending={!agent.provisioned ? "true" : undefined}
                    >
                      <span aria-hidden>{AGENT_EMOJI[agent.name] ?? "🧑‍💼"}</span>
                    </div>
                    <p className="office-dept-seat-name">{agentDisplayLabel(agent, t)}</p>
                    <p className="office-dept-seat-status">
                      {!agent.provisioned
                        ? t("office.floor.agentPending")
                        : agent.status === "busy"
                          ? t("office.agents.busy")
                          : t("office.agents.idle")}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
          {activeEncargoHref ? (
            <Link to={activeEncargoHref} className="office-link-btn office-dept-encargo-link">
              {t("office.floor.viewEncargo")} →
            </Link>
          ) : null}
        </section>

        <aside className="office-dept-sidebar office-dept-sidebar-chat">
          <h2 className="office-panel-title">{t("office.chat.coordinatorName")}</h2>
          <div className="office-dept-coordinator-panel">
            <CoordinatorChat
              key={`${orgUnitId ?? "virtual"}-${productScope}`}
              productId={productScope === DEPARTMENT_SCOPE_GENERAL ? undefined : productScope}
              orgUnitId={orgUnitId}
              welcomeMessageKey="office.floor.coordinatorWelcome"
            />
          </div>
          {sidebarFooter}
        </aside>
      </div>

      {children ? <div className="office-dept-extras">{children}</div> : null}
    </div>
  );
}
