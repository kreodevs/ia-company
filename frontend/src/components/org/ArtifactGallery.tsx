import { Link } from "react-router-dom";
import type { Artifact } from "../../lib/org-types";
import Badge from "../ui/Badge";
import StatusBadge from "../ui/StatusBadge";

const TYPE_LABEL: Record<string, string> = {
  copy: "Copy",
  social_post: "Social",
  design: "Design",
  report: "Report",
  code: "Code",
  other: "Other",
};

export default function ArtifactGallery({ artifacts }: { artifacts: Artifact[] }) {
  if (artifacts.length === 0) {
    return <p className="text-sm text-[var(--color-muted-foreground)]">No artifacts yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-[var(--color-border)] bg-[var(--color-background)] text-xs uppercase text-[var(--color-muted-foreground)]">
          <tr>
            <th className="px-3 py-2">Title</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Agent</th>
            <th className="px-3 py-2">Preview</th>
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
                <StatusBadge status={a.status} label={a.status} />
              </td>
              <td className="px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
                {a.createdByAgent ?? "—"}
              </td>
              <td className="px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
                <span className="line-clamp-2">{a.previewText ?? JSON.stringify(a.body).slice(0, 120)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ArtifactGalleryHint({ orgUnitId }: { orgUnitId: string }) {
  return (
    <p className="text-xs text-[var(--color-muted-foreground)]">
      Artifacts appear here when agents save typed deliverables.{" "}
      <Link to={`/org-units/${orgUnitId}`} className="text-[var(--color-primary)] hover:underline">
        Configure department
      </Link>
    </p>
  );
}
