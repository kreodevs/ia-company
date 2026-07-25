import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import type { Artifact } from "../../lib/org-types";
import Badge from "../ui/Badge";

export default function OrgArtifactsPanel({
  orgUnitId,
  orgUnitName,
  limit = 5,
}: {
  orgUnitId: string;
  orgUnitName: string;
  limit?: number;
}) {
  const { t } = useTranslation();
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.orgUnits
      .artifacts(orgUnitId)
      .then((rows) => setArtifacts(rows.slice(0, limit)))
      .catch(() => setArtifacts([]))
      .finally(() => setLoading(false));
  }, [orgUnitId, limit]);

  if (loading) {
    return (
      <p className="text-xs text-[var(--color-muted-foreground)]">{t("org.artifactsLoading")}</p>
    );
  }

  if (artifacts.length === 0) {
    return (
      <p className="text-xs text-[var(--color-muted-foreground)]">
        {t("org.warRoomNoArtifacts")}{" "}
        <Link to={`/org-units/${orgUnitId}`} className="text-[var(--color-primary)] hover:underline">
          {orgUnitName}
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
          {t("org.warRoomArtifactsTitle", { name: orgUnitName })}
        </h3>
        <Link to={`/org-units/${orgUnitId}`} className="text-xs text-[var(--color-primary)] hover:underline">
          {t("org.viewAllArtifacts")}
        </Link>
      </div>
      <ul className="space-y-1.5">
        {artifacts.map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--color-border)] px-2 py-1.5 text-xs"
          >
            <span className="font-medium">{a.title}</span>
            <Badge>{a.type}</Badge>
            <Badge>{a.status}</Badge>
            {a.previewText && (
              <span className="line-clamp-1 text-[var(--color-muted-foreground)]">{a.previewText}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
