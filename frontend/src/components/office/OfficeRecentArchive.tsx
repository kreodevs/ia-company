import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";
import { api, type OfficeArchiveItem } from "../../lib/api";
import { agentDisplayLabel } from "../../lib/office-visual";
import { Card } from "../molecules/Card";

const RECENT_LIMIT = 5;

export default function OfficeRecentArchive() {
  const { t } = useTranslation();
  const [items, setItems] = useState<OfficeArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.office
      .archive({ limit: RECENT_LIMIT })
      .then((result) => {
        if (!cancelled) setItems(result.items);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card
      className="office-recent-archive"
      title={t("office.recentArchive.title")}
      footer={
        <Link to="/office/archive" className="office-link-inline text-sm font-medium">
          {t("office.recentArchive.viewAll")} →
        </Link>
      }
    >
      {loading ? (
        <p className="office-empty text-sm">{t("office.archive.loading")}</p>
      ) : items.length === 0 ? (
        <p className="office-empty text-sm">{t("office.recentArchive.empty")}</p>
      ) : (
        <ul className="office-recent-archive-list">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={item.encargoHref ?? `/office/archive?q=${encodeURIComponent(item.title)}`}
                className="office-recent-archive-item interactive"
              >
                <FileText className="office-recent-archive-icon" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="office-recent-archive-title">{item.title}</span>
                  <span className="office-recent-archive-meta">
                    {item.agentName
                      ? agentDisplayLabel({ name: item.agentName }, t)
                      : t(`office.archive.source.${item.source}`)}
                    {" · "}
                    {new Date(item.timestamp).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
