import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import {
  api,
  type CreateRepoResult,
  type ProductFile,
  type ProductTreeEntry,
  type TenantProduct,
} from "../lib/api";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";
import ProductActionsMenu from "../components/ui/ProductActionsMenu";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

interface TreeNodeProps {
  entry: ProductTreeEntry;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

function TreeNode({ entry, depth, selectedPath, onSelect }: TreeNodeProps) {
  const [open, setOpen] = useState(depth < 2);
  if (entry.type === "dir") {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="interactive flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-sm hover:bg-[var(--color-surface)]"
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
        >
          <span className="w-3 text-[var(--color-muted-foreground)]">{open ? "▾" : "▸"}</span>
          <span aria-hidden="true">📁</span>
          <span className="font-mono">{entry.name}</span>
        </button>
        {open && entry.children?.map((child) => (
          <TreeNode
            key={child.path}
            entry={child}
            depth={depth + 1}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }
  const isActive = selectedPath === entry.path;
  return (
    <button
      type="button"
      onClick={() => onSelect(entry.path)}
      className={`interactive flex w-full items-center gap-1 rounded px-1 py-0.5 text-left font-mono text-xs ${
        isActive
          ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
          : "hover:bg-[var(--color-surface)]"
      }`}
      style={{ paddingLeft: `${depth * 12 + 16}px` }}
    >
      <span aria-hidden="true">📄</span>
      <span className="truncate">{entry.name}</span>
      <span className="ml-auto text-[10px] text-[var(--color-muted-foreground)]">
        {formatBytes(entry.size)}
      </span>
    </button>
  );
}

function inferLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    json: "json",
    md: "markdown",
    css: "css",
    html: "html",
    yml: "yaml",
    yaml: "yaml",
    sh: "bash",
    toml: "ini",
    sql: "sql",
    py: "python",
  };
  return map[ext] ?? "text";
}

export default function ProductCodePage() {
  const { t } = useTranslation();
  const params = useParams<{ productId: string }>();
  const productId = params.productId;

  const [product, setProduct] = useState<TenantProduct | null>(null);
  const [tree, setTree] = useState<ProductTreeEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [file, setFile] = useState<ProductFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingFile, setLoadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [repoName, setRepoName] = useState("");
  const [repoVisibility, setRepoVisibility] = useState<"private" | "public">("private");
  const [repoResult, setRepoResult] = useState<CreateRepoResult | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    Promise.all([api.products.list(), api.products.code.tree(productId)])
      .then(([products, treeResp]) => {
        const p = products.find((x) => x.id === productId) ?? null;
        setProduct(p);
        setTree(treeResp.entries);
        if (!repoName && p) setRepoName(p.slug);
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [productId, repoName]);

  const openFile = useCallback(
    async (path: string) => {
      if (!productId) return;
      setSelectedPath(path);
      setLoadingFile(true);
      try {
        const f = await api.products.code.file(productId, path);
        setFile(f);
      } catch (err) {
        setFile(null);
        setError(String(err));
      } finally {
        setLoadingFile(false);
      }
    },
    [productId],
  );

  const createRepo = async () => {
    if (!productId || !product) return;
    setCreating(true);
    setError(null);
    try {
      const result = await api.products.code.createRepo(productId, {
        repoName,
        visibility: repoVisibility,
        description: product.description ?? undefined,
      });
      setRepoResult(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setCreating(false);
    }
  };

  const language = useMemo(() => (file ? inferLanguage(file.path) : "text"), [file]);

  if (loading) return <PageLoading message={t("common.loading")} />;
  if (!productId) return <div>Missing product id</div>;

  const canCreateRepo = ["building", "launching", "growing"].includes(product?.phase ?? "");

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageHeader
        title={t("code.title", { name: product?.name ?? "Product" })}
        subtitle={t("code.subtitle")}
      />

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge>{product?.phase}</Badge>
        {product && (
          <ProductActionsMenu
            product={product}
            onChange={() => {
              api.products.list().then((list) => {
                const updated = list.find((x) => x.id === product.id) ?? null;
                setProduct(updated);
              });
            }}
          />
        )}
        {product && (
          <Link
            to={`/war-room/${product.id}`}
            className="rounded-full border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20"
          >
            {t("warRoom.title", { name: product.name })}
          </Link>
        )}
        {product && (
          <Link
            to={`/products/${product.id}/consensus`}
            className="text-[var(--color-primary)] hover:underline"
          >
            {t("code.productMemory")}
          </Link>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="max-h-[70vh] overflow-y-auto p-2" data-testid="code-tree">
          {tree.length === 0 ? (
            <p className="p-3 text-sm text-[var(--color-muted-foreground)]">{t("code.empty")}</p>
          ) : (
            tree.map((entry) => (
              <TreeNode
                key={entry.path}
                entry={entry}
                depth={0}
                selectedPath={selectedPath}
                onSelect={openFile}
              />
            ))
          )}
        </Card>

        <Card className="min-h-[60vh] p-0">
          {!selectedPath ? (
            <div className="flex h-full items-center justify-center p-10 text-sm text-[var(--color-muted-foreground)]">
              {t("code.pickFile")}
            </div>
          ) : loadingFile ? (
            <PageLoading message={t("code.loading")} />
          ) : !file ? (
            <div className="p-4 text-sm">{t("code.couldNotLoad")}</div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2 text-xs">
                <span className="font-mono">{file.path}</span>
                <span className="text-[var(--color-muted-foreground)]">
                  {formatBytes(file.size)}
                  {file.truncated ? ` · ${t("code.truncated")}` : ""}
                </span>
              </div>
              <div className="flex-1 overflow-auto">
                {file.binary ? (
                  <div className="p-4 text-sm text-[var(--color-muted-foreground)]">
                    {t("code.binaryFile")}
                  </div>
                ) : (
                  <pre
                    className={`language-${language} whitespace-pre p-3 font-mono text-xs leading-relaxed`}
                    data-testid="code-content"
                  >
                    <code>{file.content}</code>
                  </pre>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card className="space-y-3">
        <h2 className="text-base font-semibold">{t("code.publishTitle")}</h2>
        <p className="text-xs text-[var(--color-muted-foreground)]">{t("code.publishHelp")}</p>
        {repoResult ? (
          <div className="space-y-2 rounded border border-green-300 bg-green-50 p-3 text-sm">
            <p className="text-green-800">{repoResult.message}</p>
            <p>
              <a
                href={repoResult.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--color-primary)] underline"
              >
                {repoResult.repoUrl}
              </a>
            </p>
            {repoResult.commitSha && (
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {t("code.commit", { sha: repoResult.commitSha.slice(0, 7) })}
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
            <Input
              label={t("code.repoName")}
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="my-product"
            />
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">{t("code.visibility")}</span>
              <select
                value={repoVisibility}
                onChange={(e) => setRepoVisibility(e.target.value as "private" | "public")}
                className="interactive w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              >
                <option value="private">private</option>
                <option value="public">public</option>
              </select>
            </label>
            <div className="flex items-end">
              <Button
                disabled={!canCreateRepo || creating || !repoName.trim()}
                onClick={() => void createRepo()}
                fullWidthMobile
              >
                {creating ? t("common.saving") : t("code.createRepo")}
              </Button>
            </div>
          </div>
        )}
        {!canCreateRepo && (
          <p className="text-xs text-amber-600">
            {t("code.phaseGate", { phase: product?.phase ?? "—" })}
          </p>
        )}
      </Card>
    </div>
  );
}