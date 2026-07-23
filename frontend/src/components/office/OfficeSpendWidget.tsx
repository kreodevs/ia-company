import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";

interface OfficeSpendWidgetProps {
  collapsed: boolean;
}

export default function OfficeSpendWidget({ collapsed }: OfficeSpendWidgetProps) {
  const { t } = useTranslation();
  const [cost, setCost] = useState(0);
  const [limit, setLimit] = useState<number | null>(null);

  useEffect(() => {
    api.office
      .dashboard()
      .then((d) => {
        setCost(d.usage.totalCostUsd);
        setLimit(d.usage.limits.maxCostUsdPerMonth);
      })
      .catch(() => undefined);
  }, []);

  const pct = limit ? Math.min(100, (cost / limit) * 100) : 0;
  const warning = limit != null && pct >= 85;

  if (collapsed) {
    return (
      <Link
        to="/office"
        className="office-spend-widget block text-center"
        title={t("office.spendWidget.title")}
      >
        <p className="office-spend-value">${cost.toFixed(0)}</p>
      </Link>
    );
  }

  return (
    <Link to="/office" className={cn("office-spend-widget block interactive")}>
      <p className="office-spend-label">{t("office.spendWidget.title")}</p>
      <p className="office-spend-value">
        ${cost.toFixed(2)}
        {limit != null && (
          <span style={{ fontSize: "0.72rem", fontWeight: 500, color: "#64748b" }}>
            {" "}
            {t("office.spendWidget.of")} ${limit.toFixed(0)}
          </span>
        )}
      </p>
      {limit != null && (
        <div className="office-spend-bar">
          <div
            className="office-spend-bar-fill"
            data-warning={warning ? "true" : undefined}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {limit == null && (
        <p style={{ fontSize: "0.68rem", color: "#64748b", margin: "0.25rem 0 0" }}>
          {t("office.spendWidget.unlimited")}
        </p>
      )}
    </Link>
  );
}
