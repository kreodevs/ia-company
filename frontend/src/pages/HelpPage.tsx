import { Link, Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MarkdownDoc from "../components/MarkdownDoc";
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
      className={`block rounded-xl border px-4 py-3 transition ${
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
      <div>
        <p className="text-sm text-[var(--color-muted-foreground)]">{t("help.breadcrumb")}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{t("help.title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted-foreground)]">
          {t("help.subtitle")}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
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

        <div className="min-w-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-6 py-8 sm:px-10">
          <MarkdownDoc content={article.content} />
        </div>
      </div>
    </div>
  );
}
