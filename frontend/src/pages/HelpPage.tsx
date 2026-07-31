import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, ChevronDown, Package, Settings } from "lucide-react";
import MarkdownDoc from "../components/MarkdownDoc";
import PageHeader from "../components/ui/PageHeader";
import { defaultHelpSlug, getHelpArticle, getHelpArticles } from "../content/help";
import {
  HELP_INTRO_SECTION_ID,
  getDefaultSectionId,
  getTocSection,
  getTutorialSection,
  isValidSectionId,
  normalizeSectionHash,
  parseHelpDocument,
  resolveSectionContent,
  type HelpDocSection,
} from "../lib/markdown-sections";
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
  level,
  active,
  onSelect,
}: {
  id: string;
  title: string;
  level: number;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={() => onSelect(id)}
      className={`interactive w-full rounded-lg px-3 py-2 text-left text-sm transition ${
        active
          ? "bg-[var(--color-primary)]/15 font-medium text-[var(--color-primary)]"
          : "hover:bg-[var(--color-muted)]/50"
      } ${level === 3 ? "pl-5 text-[var(--color-muted-foreground)]" : ""}`}
    >
      {title}
    </button>
  );
}

export default function HelpPage() {
  const { slug } = useParams<{ slug?: string }>();
  const { t, i18n } = useTranslation();
  const contentRef = useRef<HTMLDivElement>(null);
  const articles = getHelpArticles(i18n.language);
  const article = getHelpArticle(slug, i18n.language);
  const parsed = useMemo(
    () => (article ? parseHelpDocument(article.content) : null),
    [article],
  );
  const [activeSectionId, setActiveSectionId] = useState<string>(() =>
    parsed ? getDefaultSectionId(parsed) : HELP_INTRO_SECTION_ID,
  );
  const [articlesOpen, setArticlesOpen] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState(false);

  const tocSection = parsed ? getTocSection(parsed.sections) : undefined;
  const tutorialSection = parsed ? getTutorialSection(parsed.sections) : undefined;

  const selectSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    setSectionsOpen(false);
    window.history.replaceState(null, "", `${window.location.pathname}#${sectionId}`);
    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSectionLink = (hashId: string) => {
    if (!parsed) return;
    const normalized = normalizeSectionHash(`#${hashId}`, parsed.sections) ?? hashId;
    if (isValidSectionId(parsed, normalized)) {
      selectSection(normalized);
    }
  };

  useEffect(() => {
    if (!parsed) return;
    const hash = window.location.hash;
    if (!hash) {
      setActiveSectionId(getDefaultSectionId(parsed));
      return;
    }
    const normalized = normalizeSectionHash(hash, parsed.sections);
    if (normalized && isValidSectionId(parsed, normalized)) {
      setActiveSectionId(normalized);
    }
  }, [parsed, article?.content]);

  useEffect(() => {
    setArticlesOpen(false);
    setSectionsOpen(false);
  }, [article?.slug]);

  if (!article || !parsed) {
    return <Navigate to={`/help/${defaultHelpSlug}`} replace />;
  }

  const activeContent = resolveSectionContent(parsed, activeSectionId);
  const activeTitle =
    activeSectionId === HELP_INTRO_SECTION_ID
      ? t("help.introduction")
      : parsed.sections.find((section) => section.id === activeSectionId)?.title ?? t("help.title");

  const sidebarSections: HelpDocSection[] = parsed.sections;

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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-8">
        <aside className="order-2 space-y-3 lg:order-none lg:sticky lg:top-[calc(var(--header-height)+1rem)] lg:max-h-[calc(100dvh-var(--header-height)-2rem)] lg:space-y-2 lg:self-start lg:overflow-y-auto lg:pr-1">
          <HelpNavToggle
            label={t("help.articles")}
            hint={article.title}
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

          <div className="pt-1 lg:pt-4">
            <HelpNavToggle
              label={t("help.sections")}
              hint={activeTitle}
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
              {parsed.intro && !tutorialSection ? (
                <HelpSectionLink
                  id={HELP_INTRO_SECTION_ID}
                  title={t("help.introduction")}
                  level={2}
                  active={activeSectionId === HELP_INTRO_SECTION_ID}
                  onSelect={selectSection}
                />
              ) : null}
              {sidebarSections.map((section) => (
                <HelpSectionLink
                  key={section.id}
                  id={section.id}
                  title={
                    tocSection?.id === section.id
                      ? t("help.tableOfContents")
                      : tutorialSection?.id === section.id
                        ? t("help.tutorialStart")
                        : section.title
                  }
                  level={section.level}
                  active={activeSectionId === section.id}
                  onSelect={selectSection}
                />
              ))}
            </nav>
          </div>
        </aside>

        <div
          ref={contentRef}
          className="order-1 min-w-0 scroll-mt-28 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-6 sm:px-8 sm:py-8 lg:order-none"
        >
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
            <h2 className="text-lg font-semibold">{activeTitle}</h2>
            {activeSectionId !== getDefaultSectionId(parsed) && (
              <button
                type="button"
                onClick={() => selectSection(getDefaultSectionId(parsed))}
                className="interactive text-sm text-[var(--color-primary)] hover:underline"
              >
                ← {t("help.backToTutorial")}
              </button>
            )}
          </div>

          <MarkdownDoc
            key={activeSectionId}
            content={activeContent}
            onSectionLink={handleSectionLink}
          />
        </div>
      </div>
    </div>
  );
}
