import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Initiatives } from "../components/office/Initiatives";
import { InitiativeForm } from "../components/office/InitiativeForm";
import PageHeader from "../components/ui/PageHeader";
import PageFrame from "../components/ui/PageFrame";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Panel from "../components/ui/Panel";

export const OfficeInitiativesPage: React.FC = () => {
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
              { label: t("nav.initiatives") },
            ]}
          />
        }
        title={t("office.pages.initiatives.title")}
        subtitle={t("office.pages.initiatives.subtitle")}
      />
      <InitiativeForm onSuccess={handleSuccess} />
      <Panel title={t("office.pages.initiatives.panelList")} subtitle={t("office.pages.initiatives.panelListSubtitle")}>
        <Initiatives key={refreshKey} />
      </Panel>
    </PageFrame>
  );
};
