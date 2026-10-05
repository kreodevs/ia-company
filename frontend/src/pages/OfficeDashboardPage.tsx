import { useTranslation } from "react-i18next";
import PageHeader from "../components/ui/PageHeader";
import PageFrame from "../components/ui/PageFrame";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import { Dashboard } from "../components/office/Dashboard";

export const OfficeDashboardPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <PageFrame width="office">
      <PageHeader
        variant="command"
        eyebrow={
          <Breadcrumbs
            items={[
              { label: t("office.title"), to: "/office" },
              { label: t("office.pages.dashboard.breadcrumb") },
            ]}
          />
        }
        title={t("office.pages.dashboard.title")}
        subtitle={t("office.pages.dashboard.subtitle")}
      />
      <Dashboard />
    </PageFrame>
  );
};
