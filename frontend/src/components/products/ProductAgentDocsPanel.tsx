import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, FolderOpen } from "lucide-react";
import {
  api,
  type ProductAgentDocFile,
  type ProductAgentDocsIndex,
  type ProductFile,
} from "../../lib/api";
import EmptyState from "../ui/EmptyState";
import Panel from "../ui/Panel";
import MarkdownView from "../ui/MarkdownView";

const ROLE_EMOJI: Record<string, string> = {
  research: "🔍",
  ceo: "👔",
  critic: "🧐",
  product: "🧭",
  cto: "🛠️",
  cfo: "💰",
  fullstack: "💻",
  qa: "🧪",
  devops: "🚀",
  marketing: "📣",
  operations: "📈",
  sales: "💼",
  interaction: "🎯",
  ui: "🎨",
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export interface ProductAgentDocsPanelProps {
  productId: string;
}

export default function ProductAgentDocsPanel({ productId }: ProductAgentDocsPanelProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState<ProductAgentDocsIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [file, setFile] = useState<ProductFile | null>(null);
  const [fileLoading, setFileLoading] = useState(false);

  const loadIndex = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.products.agentDocs(productId);
      setIndex(data);
      if (data.total === 0) {
        setSelectedPath(null);
        setFile(null);
        return;
      }
      const first = data.roles[0]?.docs[0];
      if (first) {
        setSelectedPath((prev) => prev ?? first.path);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void loadIndex();
  }, [loadIndex]);

  useEffect(() => {
    if (!selectedPath) {
      setFile(null);
      return;
    }
    setFileLoading(true);
    api.products.code
      .file(productId, selectedPath)
      .then(setFile)
      .catch(() => setFile(null))
      .finally(() => setFileLoading(false));
  }, [productId, selectedPath]);

  const selectedDoc = useMemo(() => {
    if (!index || !selectedPath) return null;
    for (const group of index.roles) {
      const doc = group.docs.find((d) => d.path === selectedPath);
      if (doc) return doc;
    }
    return null;
  }, [index, selectedPath]);

  const roleLabel = (role: string) =>
    t(`consensus.docsRoles.${role}`, { defaultValue: role });

  if (loading) {
    return (
      <p className="text-sm text-[var(--color-muted-foreground)]">{t("consensus.docsLoading")}</p>
    );
  }

  if (error) {
    return <p className="text-sm text-[var(--color-destructive)]">{error}</p>;
  }

  if (!index || index.total === 0) {
    return (
      <EmptyState
        title={t("consensus.docsEmptyTitle")}
        description={t("consensus.docsEmptyDesc")}
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(220px,280px)_1fr]">
      <Panel title={t("consensus.docsSidebarTitle")} bodySize="sm" hover>
        <ul className="space-y-3">
          {index.roles.map((group) => (
            <li key={group.role}>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <span aria-hidden>{ROLE_EMOJI[group.role] ?? "📄"}</span>
                {roleLabel(group.role)}
                <span className="font-normal normal-case">({group.docs.length})</span>
              </p>
              <ul className="space-y-0.5">
                {group.docs.map((doc) => (
                  <DocListItem
                    key={doc.path}
                    doc={doc}
                    active={selectedPath === doc.path}
                    onSelect={() => setSelectedPath(doc.path)}
                  />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title={
          selectedDoc ? (
            <span className="inline-flex items-center gap-2 font-mono text-sm">
              <FileText className="h-4 w-4 shrink-0" aria-hidden />
              {selectedDoc.path}
            </span>
          ) : (
            t("consensus.docsPreviewTitle")
          )
        }
        subtitle={
          selectedDoc
            ? t("consensus.docsPreviewMeta", {
                size: formatBytes(selectedDoc.size),
                date: new Date(selectedDoc.modifiedAt).toLocaleString(),
              })
            : undefined
        }
        hover
      >
        {fileLoading ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">{t("consensus.docsFileLoading")}</p>
        ) : file?.binary ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">{t("consensus.docsBinary")}</p>
        ) : (
          <>
            {file?.truncated && (
              <p className="mb-2 text-xs text-[var(--color-warning, var(--color-muted-foreground))]">
                {t("consensus.docsTruncated")}
              </p>
            )}
            <MarkdownView
              value={file?.content ?? ""}
              ariaLabel={selectedDoc?.name}
              emptyMessage={t("consensus.docsPreviewEmpty")}
            />
          </>
        )}
      </Panel>
    </div>
  );
}

function DocListItem({
  doc,
  active,
  onSelect,
}: {
  doc: ProductAgentDocFile;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`interactive flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs ${
          active
            ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
            : "hover:bg-[var(--color-surface)]"
        }`}
      >
        <FolderOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{doc.name}</span>
          <span className="text-[10px] text-[var(--color-muted-foreground)]">
            {formatBytes(doc.size)}
          </span>
        </span>
      </button>
    </li>
  );
}
