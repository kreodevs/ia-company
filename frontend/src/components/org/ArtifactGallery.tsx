import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Artifact } from "../../lib/org-types";
import Badge from "../ui/Badge";
import StatusBadge from "../ui/StatusBadge";
import Select from "../ui/Select";
import Button from "../ui/Button";

const TYPE_LABEL: Record<string, string> = {
  copy: "Copy",
  social_post: "Social",
  design: "Design",
  report: "Report",
  code: "Code",
  other: "Other",
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

function artifactBodyText(body: Record<string, unknown>): string {
  if (typeof body.content === "string") return body.content;
  return JSON.stringify(body, null, 2);
}

export default function ArtifactGallery({
  artifacts,
  onStatusChange,
}: {
  artifacts: Artifact[];
  onStatusChange?: (artifactId: string, status: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (artifacts.length === 0) {
    return <p className="text-sm text-[var(--color-muted-foreground)]">{t("org.noArtifacts")}</p>;
  }

  const selected = artifacts.find((a) => a.id === selectedId) ?? null;

  const handleStatus = async (artifactId: string, status: string) => {
    if (!onStatusChange) return;
    setBusyId(artifactId);
    try {
      await onStatusChange(artifactId, status);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-background)] text-xs uppercase text-[var(--color-muted-foreground)]">
            <tr>
              <th className="px-3 py-2">{t("org.artifactTitle")}</th>
              <th className="px-3 py-2">{t("org.artifactType")}</th>
              <th className="px-3 py-2">{t("org.artifactStatus")}</th>
              <th className="px-3 py-2">{t("org.artifactAgent")}</th>
              <th className="px-3 py-2">{t("org.artifactPreview")}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {artifacts.map((a) => (
              <tr key={a.id} className="border-b border-[var(--color-border)] last:border-0">
                <td className="px-3 py-2 font-medium">{a.title}</td>
                <td className="px-3 py-2">
                  <Badge>{TYPE_LABEL[a.type] ?? a.type}</Badge>
                </td>
                <td className="px-3 py-2">
                  {onStatusChange ? (
                    <Select
                      size="sm"
                      value={a.status}
                      ariaLabel={t("org.artifactStatus")}
                      options={STATUS_OPTIONS}
                      onChange={(status) => void handleStatus(a.id, status)}
                      className="max-w-[140px]"
                    />
                  ) : (
                    <StatusBadge status={a.status} label={a.status} />
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
                  {a.createdByAgent ?? "—"}
                </td>
                <td className="px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
                  <span className="line-clamp-2">
                    {a.previewText ?? artifactBodyText(a.body).slice(0, 120)}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busyId === a.id}
                    onClick={() => setSelectedId(a.id === selectedId ? null : a.id)}
                  >
                    {selectedId === a.id ? t("org.hideDetail") : t("org.viewDetail")}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h4 className="font-semibold">{selected.title}</h4>
            <Badge>{TYPE_LABEL[selected.type] ?? selected.type}</Badge>
            {selected.productId && (
              <Link
                to={`/war-room/${selected.productId}`}
                className="text-xs text-[var(--color-primary)] hover:underline"
              >
                {t("org.linkedProduct")}
              </Link>
            )}
          </div>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs">
            {artifactBodyText(selected.body)}
          </pre>
        </div>
      )}
    </div>
  );
}

export function ArtifactGalleryHint({ orgUnitId }: { orgUnitId: string }) {
  const { t } = useTranslation();
  return (
    <p className="text-xs text-[var(--color-muted-foreground)]">
      {t("org.artifactsHint")}{" "}
      <Link to={`/org-units/${orgUnitId}`} className="text-[var(--color-primary)] hover:underline">
        {t("org.configTitle")}
      </Link>
    </p>
  );
}
