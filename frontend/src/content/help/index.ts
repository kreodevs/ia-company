import type { AppLanguage } from "../../i18n";
import tutorialMdEs from "./tutorial.md?raw";
import tutorialMdEn from "./tutorial.en.md?raw";
import guiaOficinaEs from "./guia-oficina.md?raw";
import guiaOficinaEn from "./guia-oficina.en.md?raw";
import guiaProductosEs from "./guia-productos.md?raw";
import guiaProductosEn from "./guia-productos.en.md?raw";
import guiaDepartamentosEs from "./guia-departamentos.md?raw";
import guiaDepartamentosEn from "./guia-departamentos.en.md?raw";
import guiaEquipoIaEs from "./guia-equipo-ia.md?raw";
import guiaEquipoIaEn from "./guia-equipo-ia.en.md?raw";
import guiaFlujosEs from "./guia-flujos.md?raw";
import guiaFlujosEn from "./guia-flujos.en.md?raw";
import guiaPilotoEs from "./guia-piloto.md?raw";
import guiaPilotoEn from "./guia-piloto.en.md?raw";

export interface HelpArticle {
  slug: string;
  title: string;
  description: string;
  content: string;
}

export const defaultHelpSlug = "guia-completa";

/** Legacy slugs → current article + optional in-page section hash. */
export const HELP_SLUG_REDIRECTS: Record<
  string,
  { slug: string; hashEs?: string; hashEn?: string }
> = {
  "guia-operaciones": { slug: "guia-flujos", hashEs: "operaciones-ops", hashEn: "operations-ops" },
  "como-construir-agentes": {
    slug: "guia-equipo-ia",
    hashEs: "cómo-construir-agentes",
    hashEn: "how-to-build-agents",
  },
  handoffs: { slug: "guia-equipo-ia", hashEs: "handoffs-y-flujo", hashEn: "handoffs-and-flow" },
};

interface HelpArticleMeta {
  slug: string;
  title: string;
  description: string;
  contentEs: string;
  contentEn: string;
}

const HELP_ARTICLE_REGISTRY: HelpArticleMeta[] = [
  {
    slug: "guia-completa",
    title: "Manual de usuario",
    description: "Inicio rápido, mapa de la plataforma y enlaces a guías por tema.",
    contentEs: tutorialMdEs,
    contentEn: tutorialMdEn,
  },
  {
    slug: "guia-oficina",
    title: "Oficina y encargos",
    description: "Coordinador, alcance dept./producto, Mis encargos, War room y archivo.",
    contentEs: guiaOficinaEs,
    contentEn: guiaOficinaEn,
  },
  {
    slug: "guia-productos",
    title: "Productos",
    description: "Fases queued→growing, consenso por producto, desk y vínculo Org Unit.",
    contentEs: guiaProductosEs,
    contentEn: guiaProductosEn,
  },
  {
    slug: "guia-departamentos",
    title: "Departamentos",
    description: "Salas virtuales vs Org Studio, design.md, tokens y galería.",
    contentEs: guiaDepartamentosEs,
    contentEn: guiaDepartamentosEn,
  },
  {
    slug: "guia-equipo-ia",
    title: "Plantilla de especialistas y habilidades",
    description: "Agentes, skills, Catalog Studio, construcción de agentes y handoffs.",
    contentEs: guiaEquipoIaEs,
    contentEn: guiaEquipoIaEn,
  },
  {
    slug: "guia-flujos",
    title: "Procedimientos y programaciones",
    description: "Procedimientos por departamento, programaciones, panel Operaciones (/ops) y decisiones GO/NO-GO.",
    contentEs: guiaFlujosEs,
    contentEn: guiaFlujosEn,
  },
  {
    slug: "guia-piloto",
    title: "Flujo diario piloto",
    description: "Rutina 30–60 min/día: encargo → war room → entrega al cliente con PIN.",
    contentEs: guiaPilotoEs,
    contentEn: guiaPilotoEn,
  },
];

const EN_TITLES: Record<string, { title: string; description: string }> = {
  "guia-completa": {
    title: "User manual",
    description: "Quick start, platform map, and links to topic guides.",
  },
  "guia-oficina": {
    title: "Office and jobs",
    description: "Coordinator, dept./product scope, My jobs, War room, and archive.",
  },
  "guia-productos": {
    title: "Products",
    description: "Queued→growing phases, product consensus, desk, and Org Unit link.",
  },
  "guia-departamentos": {
    title: "Departments",
    description: "Virtual rooms vs Org Studio, design.md, tokens, and gallery.",
  },
  "guia-equipo-ia": {
    title: "Specialist templates and skills",
    description: "Agents, skills, Catalog Studio, building agents, and handoffs.",
  },
  "guia-flujos": {
    title: "Procedures and schedules",
    description: "Department procedures, schedules, Operations panel (/ops), and GO/NO-GO decisions.",
  },
  "guia-piloto": {
    title: "Daily pilot workflow",
    description: "30–60 min/day routine: job → war room → client delivery with optional PIN.",
  },
};

function normalizeLang(lang: string): AppLanguage {
  return lang === "en" ? "en" : "es";
}

export function getHelpArticles(lang: string): HelpArticle[] {
  const locale = normalizeLang(lang);
  return HELP_ARTICLE_REGISTRY.map((entry) => {
    const enMeta = EN_TITLES[entry.slug];
    if (locale === "en" && enMeta) {
      return {
        slug: entry.slug,
        title: enMeta.title,
        description: enMeta.description,
        content: entry.contentEn,
      };
    }
    return {
      slug: entry.slug,
      title: entry.title,
      description: entry.description,
      content: entry.contentEs,
    };
  });
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

export function resolveHelpSlugRedirect(
  slug: string | undefined,
  lang: string = "es",
): string | undefined {
  if (!slug) return undefined;
  const redirect = HELP_SLUG_REDIRECTS[slug];
  if (!redirect) return undefined;
  const locale = lang === "en" ? "en" : "es";
  const hash = locale === "en" ? redirect.hashEn ?? redirect.hashEs : redirect.hashEs;
  return hash ? `${redirect.slug}#${hash}` : redirect.slug;
}
