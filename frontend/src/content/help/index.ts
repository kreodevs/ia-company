import tutorialMd from "./tutorial.md?raw";

export interface HelpArticle {
  slug: string;
  title: string;
  description: string;
  content: string;
}

export const helpArticles: HelpArticle[] = [
  {
    slug: "guia-completa",
    title: "Guía completa",
    description: "Tutorial de uso: roles, workflows, autonomía multi-producto y operación.",
    content: tutorialMd,
  },
];

export const defaultHelpSlug = "guia-completa";

export function getHelpArticle(slug: string | undefined): HelpArticle | undefined {
  if (!slug) return helpArticles.find((a) => a.slug === defaultHelpSlug);
  return helpArticles.find((a) => a.slug === slug);
}
