import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type OfficeDashboard } from "../lib/api";
import PageLoading from "../components/ui/PageLoading";
import DepartmentRoomView from "../components/office/DepartmentRoomView";

export default function OfficeDepartmentPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const [dashboard, setDashboard] = useState<OfficeDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const dash = await api.office.dashboard();
    setDashboard(dash);
  }, []);

  useEffect(() => {
    refresh()
      .catch(() => setDashboard(null))
      .finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (!dashboard?.stats.activeRuns) return;
    const timer = window.setInterval(() => void refresh(), 8000);
    return () => window.clearInterval(timer);
  }, [dashboard?.stats.activeRuns, refresh]);

  const department = useMemo(() => {
    if (!dashboard || !slug) return null;
    return dashboard.departments.find((d) => d.slug === slug && d.kind === "virtual") ?? null;
  }, [dashboard, slug]);

  if (loading) return <PageLoading message={t("office.loading")} />;

  if (!department || !dashboard) {
    return (
      <div className="office-dept-page">
        <p>{t("office.floor.deptNotFound")}</p>
        <Link to="/office" className="office-link-btn">
          ← {t("office.title")}
        </Link>
      </div>
    );
  }

  const title = department.labelKey ? t(department.labelKey) : department.slug;
  const description = department.descKey ? t(department.descKey) : "";

  return (
    <DepartmentRoomView
      backHref="/office"
      backLabel={t("office.floor.backToFloor")}
      title={title}
      subtitle={description}
      emoji={department.emoji}
      status={department.status}
      agentNames={department.agentNames}
      agents={department.agentNames.map((name) => {
        const found = dashboard.agents.find((agent) => agent.name === name);
        return {
          id: found?.id ?? name,
          name,
          role: found?.role ?? null,
          status: found?.status ?? "idle",
          provisioned: Boolean(found),
        };
      })}
      activeEncargoHref={department.activeEncargoHref}
      departmentSlug={department.slug}
      sidebarFooter={
        <>
          <h2 className="office-panel-title" style={{ marginTop: "1.25rem" }}>
            {t("office.activity.title")}
          </h2>
          <DeptActivity activity={dashboard.activity} />
        </>
      }
    />
  );
}

function DeptActivity({ activity }: { activity: OfficeDashboard["activity"] }) {
  const { t } = useTranslation();
  const filtered = activity.filter((item) => item.type.startsWith("run_"));

  if (filtered.length === 0) {
    return <p className="office-empty">{t("office.activity.empty")}</p>;
  }

  return (
    <ul className="office-activity-list">
      {filtered.slice(0, 6).map((item) => (
        <li key={item.id}>
          {item.href ? (
            <Link to={item.href} className="office-activity-item">
              <div className="office-activity-row">
                <span className="office-activity-dot" data-type={item.type} aria-hidden />
                <p className="office-activity-title">{item.title}</p>
              </div>
              <p className="office-activity-meta">{t(`office.activity.${item.type}`)}</p>
            </Link>
          ) : (
            <div className="office-activity-item">{item.title}</div>
          )}
        </li>
      ))}
    </ul>
  );
}
