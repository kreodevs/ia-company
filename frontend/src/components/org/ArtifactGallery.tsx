import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Artifact } from "../../lib/org-types";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Select from "../ui/Select";
import { DataTable, type DataTableColumn } from "../organisms/DataTable";

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

  const handleStatus = async (artifactId: string, status: string) => {
    if (!onStatusChange) return;
    setBusyId(artifactId);
    try {
      await onStatusChange(artifactId, status);
    } finally {
      setBusyId(null);
    }
  };

  const tableRows = useMemo(
    () =>
      artifacts.map((a) => ({
        ...a,
        typeLabel: TYPE_LABEL[a.type] ?? a.type,
        preview:
          a.previewText ?? artifactBodyText(a.body).slice(0, 120),
      })),
    [artifacts],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      {
        field: "title",
        header: t("org.artifactTitle"),
        sortable: true,
        filterable: true,
      },
      {
        field: "typeLabel",
        header: t("org.artifactType"),
        sortable: true,
        body: (row: (typeof tableRows)[0]) => (
          <Badge>{row.typeLabel}</Badge>
        ),
      },
      {
        field: "status",
        header: t("org.artifactStatus"),
        sortable: true,
        body: (row: (typeof tableRows)[0]) =>
          onStatusChange ? (
            <Select
              size="sm"
              value={row.status}
              ariaLabel={t("org.artifactStatus")}
              options={STATUS_OPTIONS}
              onChange={(status) => void handleStatus(row.id, status)}
              className="max-w-[140px]"
            />
          ) : (
            <span className="text-xs">{row.status}</span>
          ),
      },
      {
        field: "createdByAgent",
        header: t("org.artifactAgent"),
        body: (row: (typeof tableRows)[0]) => (
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {row.createdByAgent ?? "—"}
          </span>
        ),
      },
      {
        field: "preview",
        header: t("org.artifactPreview"),
        body: (row: (typeof tableRows)[0]) => (
          <span className="line-clamp-2 text-xs text-[var(--color-muted-foreground)]">
            {row.preview}
          </span>
        ),
      },
      {
        field: "actions",
        header: "",
        sortable: false,
        width: "120px",
        body: (row: (typeof tableRows)[0]) => (
          <Button
            variant="secondary"
            size="sm"
            disabled={busyId === row.id}
            onClick={() => setSelectedId(row.id === selectedId ? null : row.id)}
          >
            {selectedId === row.id ? t("org.hideDetail") : t("org.viewDetail")}
          </Button>
        ),
      },
    ],
    [busyId, onStatusChange, selectedId, t],
  );

  if (artifacts.length === 0) {
    return <p className="text-sm text-[var(--color-muted-foreground)]">{t("org.noArtifacts")}</p>;
  }

  const selected = artifacts.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="kreo-org space-y-4">
      <DataTable
        columns={columns}
        data={tableRows}
        dense
        globalFilterEnabled
        globalFilterPlaceholder={t("org.artifactSearchPlaceholder", {
          defaultValue: "Search artifacts…",
        })}
        emptyMessage={t("org.noArtifacts")}
        paginator={artifacts.length > 10}
        rows={10}
      />

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
