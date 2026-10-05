import { useTranslation } from "react-i18next";
import PageHeader from "../components/ui/PageHeader";
import PageFrame from "../components/ui/PageFrame";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import { Objectives } from "../components/office/Objectives";
import { Initiatives } from "../components/office/Initiatives";
import { Dashboard } from "../components/office/Dashboard";
import Panel from "../components/ui/Panel";

export const OfficeStrategyPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <PageFrame width="office">
      <PageHeader
        variant="command"
        eyebrow={
          <Breadcrumbs
            items={[
              { label: t("office.title"), to: "/office" },
              { label: t("office.pages.strategy.breadcrumb") },
            ]}
          />
        }
        title={t("office.pages.strategy.title")}
        subtitle={t("office.pages.strategy.subtitle")}
      />
      <Panel title={t("office.pages.strategy.panelObjectives")} bodySize="sm">
        <Objectives />
      </Panel>
      <Panel title={t("office.pages.strategy.panelInitiatives")} bodySize="sm">
        <Initiatives />
      </Panel>
      <Dashboard />
    </PageFrame>
  );
};
