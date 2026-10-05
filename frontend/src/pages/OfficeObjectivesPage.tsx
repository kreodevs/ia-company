import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Objectives } from "../components/office/Objectives";
import { ObjectiveForm } from "../components/office/ObjectiveForm";
import PageHeader from "../components/ui/PageHeader";
import PageFrame from "../components/ui/PageFrame";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Panel from "../components/ui/Panel";

export const OfficeObjectivesPage: React.FC = () => {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <PageFrame width="office">
      <PageHeader
        variant="command"
        eyebrow={
          <Breadcrumbs
            items={[
              { label: t("office.title"), to: "/office" },
              { label: t("nav.objectives") },
            ]}
          />
        }
        title={t("office.pages.objectives.title")}
        subtitle={t("office.pages.objectives.subtitle")}
      />
      <ObjectiveForm onSuccess={handleSuccess} />
      <Panel title={t("office.pages.objectives.panelActive")} subtitle={t("office.pages.objectives.panelActiveSubtitle")}>
        <Objectives key={refreshKey} />
      </Panel>
    </PageFrame>
  );
};
