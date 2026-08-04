import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import type { OrgUnit } from "../lib/org-types";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import PageLoading from "../components/ui/PageLoading";
import Badge from "../components/ui/Badge";

export default function OrgUnitsPage() {
  const { t } = useTranslation();
  const [units, setUnits] = useState<OrgUnit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.orgUnits
      .list()
      .then(setUnits)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading message={t("org.loading")} />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow={
          <Breadcrumbs items={[{ label: t("nav.orgUnits"), to: "/org-units" }, { label: t("org.title") }]} />
        }
        title={t("org.title")}
        subtitle={t("org.subtitle")}
        actions={
          <Link to="/org-studio">
            <Button>{t("org.createDepartment")}</Button>
          </Link>
        }
      />

      {units.length === 0 ? (
        <EmptyState
          title={t("org.emptyTitle")}
          description={t("org.emptyDesc")}
          action={
            <Link to="/org-studio">
              <Button>{t("org.openStudio")}</Button>
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {units.map((unit) => (
            <li key={unit.id}>
              <Panel
                title={unit.name}
                subtitle={unit.slug}
                hover
                actions={<Badge>{unit.type.replace(/_/g, " ")}</Badge>}
              >
                <p className="mb-3 text-sm text-[var(--color-muted-foreground)]">
                  {unit.description ?? t("org.noDescription")}
                </p>
                <p className="mb-4 font-mono text-[10px] text-[var(--color-muted-foreground)]">
                  {unit.workspacePath}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/org-units/${unit.id}?tab=staff`}>
                    <Button size="sm">{t("org.manageStaff")}</Button>
                  </Link>
                  <Link to={`/org-units/${unit.id}?tab=settings&section=profile`}>
                    <Button size="sm" variant="secondary">
                      {t("org.editDepartment")}
                    </Button>
                  </Link>
                  <Link
                    to={`/org-units/${unit.id}?tab=room`}
                    className="inline-flex items-center self-center px-2 text-sm font-medium text-[var(--color-primary)] hover:underline"
                  >
                    {t("org.openDepartment")} →
                  </Link>
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
