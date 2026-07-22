import { useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MarkdownDoc from "../components/MarkdownDoc";
import PageHeader from "../components/ui/PageHeader";
import { defaultHelpSlug, getHelpArticle, getHelpArticles } from "../content/help";
import {
  extractDocumentHeadings,
  getTocHeadingId,
  scrollToHeading,
} from "../lib/markdown-slug";

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
  level,
}: {
  id: string;
  title: string;
  level: number;
}) {
  return (
    <button
      type="button"
      onClick={() => scrollToHeading(id)}
      className={`interactive w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[var(--color-muted)]/50 ${
        level === 3 ? "pl-5 text-[var(--color-muted-foreground)]" : "font-medium"
      }`}
    >
      {title}
    </button>
  );
}

export default function HelpPage() {
  const { slug } = useParams<{ slug?: string }>();
  const { t, i18n } = useTranslation();
  const articles = getHelpArticles(i18n.language);
  const article = getHelpArticle(slug, i18n.language);
  const tocId = getTocHeadingId(i18n.language);
  const sectionHeadings = useMemo(
    () => (article ? extractDocumentHeadings(article.content) : []),
    [article],
  );

  if (!article) {
    return <Navigate to={`/help/${defaultHelpSlug}`} replace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t("help.breadcrumb")} title={t("help.title")} subtitle={t("help.subtitle")} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-8">
        <aside className="space-y-2 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
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

          {sectionHeadings.length > 0 ? (
            <div className="pt-4">
              <p className="px-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                {t("help.sections")}
              </p>
              <nav className="mt-2 space-y-0.5" aria-label={t("help.sections")}>
                <HelpSectionLink id={tocId} title={t("help.tableOfContents")} level={2} />
                {sectionHeadings.map((heading) => (
                  <HelpSectionLink
                    key={heading.id}
                    id={heading.id}
                    title={heading.title}
                    level={heading.level}
                  />
                ))}
              </nav>
            </div>
          ) : null}
        </aside>

        <div className="min-w-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-6 sm:px-8 sm:py-8">
          <MarkdownDoc content={article.content} tocId={tocId} />
        </div>
      </div>
    </div>
  );
}
