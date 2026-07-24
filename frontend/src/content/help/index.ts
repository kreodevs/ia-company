import type { AppLanguage } from "../../i18n";
import tutorialMdEs from "./tutorial.md?raw";
import tutorialMdEn from "./tutorial.en.md?raw";

export interface HelpArticle {
  slug: string;
  title: string;
  description: string;
  content: string;
}

export const defaultHelpSlug = "guia-completa";

const ARTICLE_META: Record<
  AppLanguage,
  { title: string; description: string; content: string }
> = {
  es: {
    title: "Guía completa",
    description: "Oficina bajo demanda, productos con GitHub, war room, encargos y programación opcional.",
    content: tutorialMdEs,
  },
  en: {
    title: "Complete guide",
    description: "On-demand Office, GitHub products, war room, jobs, and optional scheduling.",
    content: tutorialMdEn,
  },
};

function normalizeLang(lang: string): AppLanguage {
  return lang === "en" ? "en" : "es";
}

export function getHelpArticles(lang: string): HelpArticle[] {
  const meta = ARTICLE_META[normalizeLang(lang)] ?? ARTICLE_META.es;
  return [
    {
      slug: defaultHelpSlug,
      title: meta.title,
      description: meta.description,
      content: meta.content,
    },
  ];
}

/** Spanish articles — kept for existing imports until pages use getHelpArticles(lang). */
export const helpArticles: HelpArticle[] = getHelpArticles("es");

export function getHelpArticle(
  slug: string | undefined,
  lang: string = "es",
): HelpArticle | undefined {
  const articles = getHelpArticles(lang);
  if (!slug) return articles.find((a) => a.slug === defaultHelpSlug);
  return articles.find((a) => a.slug === slug);
}
