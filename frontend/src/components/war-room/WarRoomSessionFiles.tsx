import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Folder } from "lucide-react";
import { api, type OfficeSessionFilesResponse, type OfficeSessionTreeEntry } from "../../lib/api";
import RichMarkdownView from "../ui/RichMarkdownView";

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function DirTree({
  entries,
  prefix = "",
  onPick,
}: {
  entries: OfficeSessionTreeEntry[];
  prefix?: string;
  onPick: (relPath: string) => void;
}) {
  return (
    <ul className="space-y-0.5">
      {entries.map((entry) => {
        const relPath = entry.path || `${prefix}/${entry.name}`.replace(/^\/+/, "");
        const expanded = entry.path || relPath;
        if (entry.type === "dir") {
          return (
            <li key={expanded} className="pl-2">
              <div className="flex items-center gap-1 py-0.5 text-xs text-[var(--color-muted-foreground)]">
                <Folder aria-hidden className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{entry.name}</span>
              </div>
              {entry.children && entry.children.length > 0 ? (
                <div className="ml-2 border-l border-[var(--color-border)]/60 pl-2">
                  <DirTree entries={entry.children} prefix={expanded} onPick={onPick} />
                </div>
              ) : null}
            </li>
          );
        }
        return (
          <li key={expanded} className="pl-2">
            <button
              type="button"
              onClick={() => onPick(expanded)}
              className="inline-flex max-w-full items-center gap-1 rounded border border-transparent px-1 py-0.5 text-left text-xs text-[var(--color-primary)] hover:border-[var(--color-border)] hover:bg-[var(--color-muted)]/40"
              title={expanded}
            >
              <FileText aria-hidden className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 truncate">{entry.name}</span>
              <span className="text-[var(--color-muted-foreground)]">— {formatBytes(entry.size)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

interface SessionChoice {
  id: string;
  label: string;
  role: string;
  status: string;
}

type Props = {
  watchRunId?: string | null;
};

export default function WarRoomSessionFiles({ watchRunId }: Props) {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<SessionChoice[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [filesResp, setFilesResp] = useState<OfficeSessionFilesResponse | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<{ path: string; content: string; size: number; truncated: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!watchRunId) {
      setSessions([]);
      setActiveSessionId(null);
      setFilesResp(null);
      setFileContent(null);
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const resp = await api.office.runSessions(watchRunId);
        if (cancelled) return;
        const next: SessionChoice[] = (resp.sessions ?? []).map((s) => ({
          id: s.id,
          label: (s as unknown as { agentName?: string }).agentName ?? s.role ?? s.id.slice(0, 8),
          role: s.role ?? "",
          status: s.status ?? "",
        }));
        setSessions(next);
        if (next.length === 0) {
          setActiveSessionId(null);
        } else if (!next.some((s) => s.id === activeSessionId)) {
          setActiveSessionId(next[0].id);
        }
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [watchRunId, activeSessionId]);

  const loadTree = useCallback(async (sessionId: string) => {
    setLoadingFiles(true);
    setFileContent(null);
    setFilePath(null);
    setError(null);
    try {
      const data = await api.office.sessionFiles(sessionId);
      setFilesResp(data);
      if (data.file) {
        setFileContent(data.file);
        setFilePath(data.file.path);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setFilesResp(null);
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    if (!activeSessionId) return;
    void loadTree(activeSessionId);
  }, [activeSessionId, loadTree]);

  const pickFile = useCallback(
    async (relPath: string) => {
      if (!activeSessionId) return;
      setError(null);
      try {
        const data = await api.office.sessionFiles(activeSessionId, relPath);
        if (data.file) {
          setFileContent(data.file);
          setFilePath(data.file.path);
        } else {
          setFilePath(null);
          setFileContent(null);
          setError(t("office.files.notReadable", { defaultValue: "No se pudo abrir este archivo" }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [activeSessionId, t],
  );

  const hasTree = Boolean(filesResp?.tree && filesResp.tree.length > 0);

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
          {t("office.filesPanel.title", { defaultValue: "Archivos del encargo" })}
        </h3>
        {sessions.length > 1 && (
          <label className="flex items-center gap-2 text-xs">
            <span className="text-[var(--color-muted-foreground)]">
              {t("office.filesPanel.session", { defaultValue: "Sesión" })}
            </span>
            <select
              value={activeSessionId ?? ""}
              onChange={(e) => setActiveSessionId(e.target.value || null)}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                  {s.role ? ` — ${s.role}` : ""} {s.status ? `(${s.status})` : ""}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {!watchRunId && (
        <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
          {t("office.filesPanel.selectRun", {
            defaultValue: "Inicia o selecciona un encargo en el war-room para ver los archivos generados.",
          })}
        </p>
      )}

      {error && <p className="mt-2 text-xs text-[var(--color-destructive)]">{error}</p>}

      {watchRunId && loadingFiles && (
        <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
          {t("office.filesPanel.loadingTree", { defaultValue: "Cargando archivos…" })}
        </p>
      )}

      {watchRunId && filesResp && (
        <div className="mt-3 grid gap-4 md:grid-cols-[minmax(220px,360px)_minmax(0,1fr)]">
          <div className="rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-muted)]/10 p-2">
            <div className="mb-1 text-xs font-medium text-[var(--color-muted-foreground)]">
              {t("office.filesPanel.tree", { defaultValue: "Árbol del workspace" })}
            </div>
            {!hasTree ? (
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {t("office.filesPanel.emptyWorkspace", { defaultValue: "Workspace aún vacío (se pobla al iniciar el trabajo)." })}
              </p>
            ) : (
              <div className="max-h-[480px] overflow-auto pr-1">
                <DirTree entries={filesResp.tree} onPick={pickFile} />
              </div>
            )}
          </div>

          <div className="min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
                {filePath
                  ? filePath
                  : t("office.filesPanel.hint", { defaultValue: "Toca un archivo para abrirlo" })}
              </span>
              {fileContent?.size != null && (
                <span className="text-xs text-[var(--color-muted-foreground)]">{formatBytes(fileContent.size)}</span>
              )}
            </div>
            {!fileContent ? (
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {t("office.filesPanel.pickFile", {
                  defaultValue: "No hay archivo abierto. Elige uno del árbol.",
                })}
              </p>
            ) : (
              <>
                {fileContent.truncated && (
                  <p className="mb-2 rounded bg-[var(--color-warning)]/10 px-2 py-1 text-xs text-[var(--color-warning)]">
                    {t("office.filesPanel.truncated", {
                      defaultValue: "Vista truncada a 512 KB. El archivo es más grande.",
                    })}
                  </p>
                )}
                {fileContent.path.endsWith(".md") || fileContent.path.endsWith(".markdown") ? (
                  <RichMarkdownView value={fileContent.content} />
                ) : (
                  <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap break-words text-xs text-[var(--color-foreground)]/90">
                    {fileContent.content}
                  </pre>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
