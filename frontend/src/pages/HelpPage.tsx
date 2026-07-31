import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, ChevronDown, Package, Settings } from "lucide-react";
import MarkdownDoc from "../components/MarkdownDoc";
import PageHeader from "../components/ui/PageHeader";
import { defaultHelpSlug, getHelpArticle, getHelpArticles, resolveHelpSlugRedirect } from "../content/help";
import { injectHelpBackToTocLinks } from "../lib/help-markdown";
import {
  extractDocumentHeadings,
  extractHashId,
  getTocHeadingId,
  scrollToHeading,
  slugifyHeading,
  type DocumentHeading,
} from "../lib/markdown-slug";
import { cn } from "../lib/utils";

function HelpNavToggle({
  label,
  hint,
  open,
  onToggle,
  controlsId,
}: {
  label: string;
  hint?: string;
  open: boolean;
  onToggle: () => void;
  controlsId: string;
}) {
  return (
    <button
      type="button"
      id={`${controlsId}-toggle`}
      aria-expanded={open}
      aria-controls={controlsId}
      onClick={onToggle}
      className="interactive flex w-full items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-left lg:hidden"
    >
      <ChevronDown
        className={cn("h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] transition", !open && "-rotate-90")}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
          {label}
        </span>
        {hint && !open ? (
          <span className="mt-0.5 block truncate text-sm font-medium text-[var(--color-foreground)]">{hint}</span>
        ) : null}
      </span>
    </button>
  );
}

function HelpSidebarLink({
  slug,
  title,
  description,
  active,
}: {
  slug: string;
  title: string;
  description: string;
  active: boolean;
}) {
  return (
    <Link
      to={`/help/${slug}`}
      className={`interactive block rounded-xl border px-4 py-3 transition ${
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
          : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-muted-foreground)]/40"
      }`}
    >
      <div className="font-medium">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted-foreground)]">{description}</p>
    </Link>
  );
}

function HelpSectionLink({
  id,
  title,
  active,
  onSelect,
}: {
  id: string;
  title: string;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      aria-current={active ? "location" : undefined}
      onClick={() => onSelect(id)}
      className={`interactive w-full rounded-lg px-3 py-2 text-left text-sm transition ${
        active
          ? "bg-[var(--color-primary)]/15 font-medium text-[var(--color-primary)]"
          : "hover:bg-[var(--color-muted)]/50"
      }`}
    >
      {title}
    </button>
  );
}

function resolveHeadingHash(hash: string, headings: DocumentHeading[]): string | null {
  const id = extractHashId(hash.startsWith("#") ? hash : `#${hash}`);
  if (!id) return null;
  if (headings.some((heading) => heading.id === id)) return id;
  return headings.find((heading) => slugifyHeading(heading.title) === id)?.id ?? id;
}

export default function HelpPage() {
  const { slug } = useParams<{ slug?: string }>();
  const { t, i18n } = useTranslation();
  const redirectTarget = resolveHelpSlugRedirect(slug, i18n.language);
  if (redirectTarget) {
    return <Navigate to={`/help/${redirectTarget}`} replace />;
  }

  const contentRef = useRef<HTMLDivElement>(null);
  const articles = getHelpArticles(i18n.language);
  const article = getHelpArticle(slug, i18n.language);
  const sectionHeadings = useMemo(
    () => extractDocumentHeadings(article?.content ?? "").filter((heading) => heading.level === 2),
    [article?.content],
  );
  const articleContent = useMemo(() => {
    if (!article) return "";
    return injectHelpBackToTocLinks(
      article.content,
      getTocHeadingId(i18n.language),
      t("help.backToToc"),
    );
  }, [article, i18n.language, t]);
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [articlesOpen, setArticlesOpen] = useState(true);
  const [sectionsOpen, setSectionsOpen] = useState(false);

  const activeSectionTitle =
    sectionHeadings.find((heading) => heading.id === activeSectionId)?.title ?? article?.title ?? "";

  const scrollToSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    setSectionsOpen(false);
    scrollToHeading(sectionId);
  };

  useEffect(() => {
    if (!article) return;

    const scrollFromHash = () => {
      const hash = window.location.hash;
      if (!hash) return;
      const resolved = resolveHeadingHash(hash, sectionHeadings) ?? extractHashId(hash);
      if (resolved) {
        setActiveSectionId(resolved);
        requestAnimationFrame(() => scrollToHeading(resolved));
      }
    };

    scrollFromHash();
    window.addEventListener("hashchange", scrollFromHash);
    return () => window.removeEventListener("hashchange", scrollFromHash);
  }, [article?.slug, article?.content, sectionHeadings]);

  useEffect(() => {
    setSectionsOpen(false);
    setActiveSectionId(sectionHeadings[0]?.id ?? "");
  }, [article?.slug, sectionHeadings]);

  useEffect(() => {
    if (sectionHeadings.length === 0) return;

    const elements = sectionHeadings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => element != null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const top = visible[0]?.target.id;
        if (top) setActiveSectionId(top);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sectionHeadings, article?.slug]);

  if (!article) {
    return <Navigate to={`/help/${defaultHelpSlug}`} replace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t("help.breadcrumb")} title={t("help.title")} subtitle={t("help.subtitle")} />

      <section aria-label={t("help.quickLinks")}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
          {t("help.quickLinks")}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            to="/office"
            className="interactive flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 hover:border-[var(--color-primary)]"
          >
            <Building2 className="h-5 w-5 shrink-0 text-[var(--color-primary)]" aria-hidden />
            <span className="text-sm font-medium">{t("help.quickOffice")}</span>
          </Link>
          <Link
            to="/products"
            className="interactive flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 hover:border-[var(--color-primary)]"
          >
            <Package className="h-5 w-5 shrink-0 text-[var(--color-primary)]" aria-hidden />
            <span className="text-sm font-medium">{t("help.quickProducts")}</span>
          </Link>
          <Link
            to="/settings"
            className="interactive flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 hover:border-[var(--color-primary)]"
          >
            <Settings className="h-5 w-5 shrink-0 text-[var(--color-primary)]" aria-hidden />
            <span className="text-sm font-medium">{t("help.quickSettings")}</span>
          </Link>
        </div>
      </section>

      <section className="lg:hidden" aria-label={t("help.articles")}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
          {t("help.guidesByTopic")}
        </p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 snap-x snap-mandatory">
          {articles.map((item) => (
            <Link
              key={item.slug}
              to={`/help/${item.slug}`}
              className={cn(
                "interactive snap-start shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                item.slug === article.slug
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                  : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:border-[var(--color-muted-foreground)]/40",
              )}
            >
              {item.title}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-8">
        <aside className="order-2 space-y-3 lg:order-none lg:sticky lg:top-[calc(var(--header-height)+1rem)] lg:max-h-[calc(100dvh-var(--header-height)-2rem)] lg:space-y-2 lg:self-start lg:overflow-y-auto lg:pr-1">
          <HelpNavToggle
            label={t("help.articles")}
            hint={
              articlesOpen
                ? undefined
                : t("help.articlesCollapsedHint", {
                    current: article.title,
                    count: articles.length,
                  })
            }
            open={articlesOpen}
            onToggle={() => setArticlesOpen((open) => !open)}
            controlsId="help-articles-nav"
          />
          <div
            id="help-articles-nav"
            className={cn("space-y-2", articlesOpen ? "block" : "hidden lg:block")}
            role="region"
            aria-labelledby="help-articles-nav-toggle"
          >
            <p className="hidden px-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)] lg:block">
              {t("help.articles")}
            </p>
            {articles.map((item) => (
              <HelpSidebarLink
                key={item.slug}
                slug={item.slug}
                title={item.title}
                description={item.description}
                active={item.slug === article.slug}
              />
            ))}
          </div>

          {sectionHeadings.length > 0 ? (
            <div className="pt-1 lg:pt-4">
              <HelpNavToggle
                label={t("help.sections")}
                hint={activeSectionTitle}
                open={sectionsOpen}
                onToggle={() => setSectionsOpen((open) => !open)}
                controlsId="help-sections-nav"
              />
              <nav
                id="help-sections-nav"
                className={cn("mt-2 space-y-0.5", sectionsOpen ? "block" : "hidden lg:block")}
                aria-label={t("help.sections")}
                role="region"
                aria-labelledby="help-sections-nav-toggle"
              >
                <p className="mb-2 hidden px-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)] lg:block">
                  {t("help.sections")}
                </p>
                {sectionHeadings.map((heading) => (
                  <HelpSectionLink
                    key={heading.id}
                    id={heading.id}
                    title={heading.title}
                    active={activeSectionId === heading.id}
                    onSelect={scrollToSection}
                  />
                ))}
              </nav>
            </div>
          ) : null}
        </aside>

        <div
          ref={contentRef}
          className="order-1 min-w-0 scroll-mt-28 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-6 sm:px-8 sm:py-8 lg:order-none"
        >
          <MarkdownDoc
            content={articleContent}
            tocId={getTocHeadingId(i18n.language)}
            onSectionLink={scrollToHeading}
          />
        </div>
      </div>
    </div>
  );
}
