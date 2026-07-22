import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileText, History, Target, Building2, Layers } from "lucide-react";
import { api, type PipelineIdea, type TenantConsensus, type TenantProduct } from "../lib/api";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Panel from "../components/ui/Panel";
import KpiCard from "../components/ui/KpiCard";
import StatusPill from "../components/ui/StatusPill";
import MarkdownPreview from "../components/ui/MarkdownPreview";
import Select from "../components/ui/Select";

type Scope = "company" | `product:${string}` | `idea:${string}`;

interface ScopeOption {
  value: Scope;
  label: string;
}

export default function ConsensusPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [record, setRecord] = useState<TenantConsensus | null>(null);
  const [products, setProducts] = useState<TenantProduct[]>([]);
  const [ideas, setIdeas] = useState<PipelineIdea[]>([]);
  const [content, setContent] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const initialScope: Scope =
    (searchParams.get("scope") as Scope | null) ?? "company";

  const [scope, setScope] = useState<Scope>(initialScope);

  useEffect(() => {
    Promise.all([api.consensus.get(), api.products.list(), api.products.pipeline()])
      .then(([consensus, list, pipeline]) => {
        setRecord(consensus);
        setContent(consensus.content);
        setNextAction(consensus.nextAction ?? "");
        setProducts(list);
        setIdeas(pipeline.filter((i) => i.goNoGo !== "no_go"));
      })
      .finally(() => setLoading(false));
  }, []);

  const ideaProductSlug = (title: string): string | null => {
    if (!title) return null;
    return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  };

  const ideaProduct = (idea: PipelineIdea): TenantProduct | undefined =>
    products.find((p) => p.slug === ideaProductSlug(idea.title));

  const scopeOptions = useMemo<ScopeOption[]>(() => {
    const opts: ScopeOption[] = [
      { value: "company", label: t("consensus.scope.company") },
    ];
    for (const product of products) {
      opts.push({
        value: `product:${product.id}`,
        label: t("consensus.scope.product", { name: product.name, slug: product.slug }),
      });
    }
    for (const idea of ideas) {
      const linked = ideaProduct(idea);
      opts.push({
        value: `idea:${idea.id}`,
        label: linked
          ? t("consensus.scope.ideaWithProduct", { title: idea.title, product: linked.name })
          : t("consensus.scope.ideaOnly", { title: idea.title }),
      });
    }
    return opts;
  }, [products, ideas, t]);

  const switchScope = (next: Scope) => {
    setScope(next);
    setSearchParams(next === "company" ? {} : { scope: next }, { replace: true });
    if (next.startsWith("product:")) {
      navigate(`/products/${next.slice("product:".length)}/consensus`);
    } else if (next.startsWith("idea:")) {
      const ideaId = next.slice("idea:".length);
      const idea = ideas.find((i) => i.id === ideaId);
      const linked = idea ? ideaProduct(idea) : null;
      if (linked) {
        navigate(`/products/${linked.id}/consensus`);
      }
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.consensus.update({ content, nextAction: nextAction || undefined });
      setRecord(updated);
    } finally {
      setSaving(false);
    }
  };

  const dirty = useMemo(() => {
    if (!record) return false;
    return content !== record.content || (nextAction || null) !== (record.nextAction ?? null);
  }, [content, nextAction, record]);

  const contentBytes = useMemo(() => new Blob([content]).size, [content]);

  if (loading) return <PageLoading message={t("consensus.loading")} />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow={
          <Breadcrumbs
            items={[
              { label: t("nav.ops"), to: "/ops" },
              { label: t("consensus.title") },
            ]}
          />
        }
        title={t("consensus.title")}
        subtitle={t("consensus.subtitle")}
      />

      {/* KPI hero */}
      <section className="hero-strip">
        <KpiCard
          label={t("consensus.kpis.phase")}
          value={
            record?.companyPhase
              ? t(`phase.${record.companyPhase}`, { defaultValue: record.companyPhase })
              : "—"
          }
        />
        <KpiCard
          label={t("consensus.kpis.products")}
          value={products.length}
          delta={t("consensus.kpis.productsDelta", {
            pipeline: ideas.length,
          })}
        />
        <KpiCard
          label={t("consensus.kpis.docSize")}
          value={`${contentBytes}`}
          delta={t("consensus.kpis.docSizeDelta")}
        />
        <KpiCard
          label={t("consensus.kpis.lastUpdate")}
          value={
            record?.updatedAt
              ? new Date(record.updatedAt).toLocaleDateString()
              : "—"
          }
          delta={
            record?.updatedAt
              ? t("consensus.kpis.lastUpdateDelta", {
                  time: new Date(record.updatedAt ?? "").toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                })
              : t("consensus.kpis.never")
          }
        />
      </section>

      <Panel
        title={t("consensus.scope.label")}
        subtitle={t("consensus.scope.helper")}
        actions={
          <Select
            ariaLabel={t("consensus.scope.label")}
            value={scope}
            onChange={(value) => switchScope(value as Scope)}
            options={scopeOptions.map((opt) => ({
              value: opt.value,
              label: opt.label,
            }))}
            className="!w-64"
            size="sm"
          />
        }
        bodySize="sm"
      >
        {products.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {products.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/products/${p.id}/consensus`}
                  className="lift flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 hover:border-[var(--color-primary)]/40"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{p.name}</span>{" "}
                    <span className="text-xs text-[var(--color-muted-foreground)]">({p.slug})</span>
                  </span>
                  <StatusPill status={p.phase} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {t("consensus.kpis.noProducts")}
          </p>
        )}
      </Panel>

      <div className="two-col two-col--main-aside">
        <Panel
          title={
            <span className="inline-flex items-center gap-2">
              <FileText className="h-4 w-4" aria-hidden /> {t("consensus.documentPanel")}
            </span>
          }
          subtitle={t("consensus.companyHelp", { defaultValue: "Company-level memory: phase, pipeline and next action." })}
          actions={
            <Button
              onClick={() => void save()}
              disabled={saving || !dirty}
              size="sm"
            >
              {saving ? t("common.saving") : t("consensus.saveConsensus")}
            </Button>
          }
          stickyHeader
          hover
        >
          <div className="space-y-4">
            <Input
              label={t("consensus.nextAction")}
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder={t("consensus.nextActionPlaceholder")}
            />
            <MarkdownPreview
              value={content}
              onChange={setContent}
              rows={18}
              ariaLabel={t("consensus.document")}
            />
            {!dirty && record && (
              <p className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                <History className="h-3 w-3" aria-hidden />
                {t("consensus.lastUpdated", { date: new Date(record.updatedAt).toLocaleString() })}
              </p>
            )}
          </div>
        </Panel>

        <aside className="space-y-6">
          <Panel title={t("consensus.scope.company")} bodySize="sm" hover>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {t("consensus.scope.companyDescription")}
            </p>
          </Panel>

          <Panel title={t("consensus.pipelinePanel.title")} bodySize="sm">
            {ideas.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {t("consensus.pipelinePanel.empty")}
              </p>
            ) : (
              <ul className="space-y-2">
                {ideas.slice(0, 5).map((idea) => {
                  const linked = ideaProduct(idea);
                  return (
                    <li key={idea.id}>
                      <Link
                        to={linked ? `/products/${linked.id}/consensus` : "/ops"}
                        className="lift block rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3 hover:border-[var(--color-primary)]/40"
                      >
                        <div className="flex items-center gap-2">
                          <Target className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" aria-hidden />
                          <span className="truncate font-medium text-sm">{idea.title}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[var(--color-muted-foreground)]">
                          <span>
                            {t("consensus.pipelinePanel.scoreLabel", {
                              score: idea.interestScore.toFixed(1),
                            })}
                          </span>
                          {linked && <span>→ {linked.name}</span>}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title={t("consensus.tip.title")} bodySize="sm">
            <p className="flex items-start gap-2 text-sm text-[var(--color-muted-foreground)]">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{t("consensus.tip.body")}</span>
            </p>
          </Panel>

          <Panel
            title={
              <span className="inline-flex items-center gap-2">
                <Layers className="h-4 w-4" aria-hidden /> {t("consensus.scope.label")}
              </span>
            }
            bodySize="sm"
          >
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {t("consensus.scope.helper")}
            </p>
            <ul className="mt-2 space-y-1.5 text-xs">
              {scopeOptions.slice(0, 6).map((opt) => (
                <li key={opt.value} className="flex items-start gap-1.5">
                  <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" aria-hidden />
                  <span className="text-[var(--color-muted-foreground)]">{opt.label}</span>
                </li>
              ))}
              {scopeOptions.length > 6 && (
                <li className="text-[var(--color-muted-foreground)]">
                  + {scopeOptions.length - 6} {t("consensus.scope.more")}
                </li>
              )}
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}