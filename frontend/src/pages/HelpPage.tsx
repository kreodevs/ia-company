import { Link, Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MarkdownDoc from "../components/MarkdownDoc";
import PageHeader from "../components/ui/PageHeader";
import { defaultHelpSlug, getHelpArticle, getHelpArticles } from "../content/help";

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

export default function HelpPage() {
  const { slug } = useParams<{ slug?: string }>();
  const { t, i18n } = useTranslation();
  const articles = getHelpArticles(i18n.language);
  const article = getHelpArticle(slug, i18n.language);

  if (!article) {
    return <Navigate to={`/help/${defaultHelpSlug}`} replace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t("help.breadcrumb")} title={t("help.title")} subtitle={t("help.subtitle")} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-8">
        <aside className="space-y-2 lg:sticky lg:top-24 lg:self-start">
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
        </aside>

        <div className="min-w-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-6 sm:px-8 sm:py-8">
          <MarkdownDoc content={article.content} />
        </div>
      </div>
    </div>
  );
}
