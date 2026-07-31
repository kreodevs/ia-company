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
import comoConstruirAgentesEs from "./como-construir-agentes.md?raw";
import comoConstruirAgentesEn from "./como-construir-agentes.en.md?raw";
import handoffsEs from "./handoffs.md?raw";
import handoffsEn from "./handoffs.en.md?raw";

export interface HelpArticle {
  slug: string;
  title: string;
  description: string;
  content: string;
}

export const defaultHelpSlug = "guia-completa";

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
    description: "Coordinador, aprobar runs, Mis encargos y War room.",
    contentEs: guiaOficinaEs,
    contentEn: guiaOficinaEn,
  },
  {
    slug: "guia-productos",
    title: "Productos",
    description: "Ciclo de vida, memoria por producto y vínculo con departamentos.",
    contentEs: guiaProductosEs,
    contentEn: guiaProductosEn,
  },
  {
    slug: "guia-departamentos",
    title: "Departamentos",
    description: "Org Studio, design.md, tokens y galería de artefactos.",
    contentEs: guiaDepartamentosEs,
    contentEn: guiaDepartamentosEn,
  },
  {
    slug: "guia-equipo-ia",
    title: "Equipo IA y habilidades",
    description: "Catálogo de agentes, skills y Catalog Studio.",
    contentEs: guiaEquipoIaEs,
    contentEn: guiaEquipoIaEn,
  },
  {
    slug: "guia-flujos",
    title: "Flujos y programaciones",
    description: "Playbooks de agentes y reglas opcionales en timer.",
    contentEs: guiaFlujosEs,
    contentEn: guiaFlujosEn,
  },
  {
    slug: "como-construir-agentes",
    title: "¿Cómo construir agentes?",
    description: "System prompt, entregables, carpetas docs/ y handoff JSON correcto.",
    contentEs: comoConstruirAgentesEs,
    contentEn: comoConstruirAgentesEn,
  },
  {
    slug: "handoffs",
    title: "Handoffs y flujo",
    description: "Todos los tipos de handoff, dónde se guardan y efecto en la ejecución.",
    contentEs: handoffsEs,
    contentEn: handoffsEn,
  },
];

const EN_TITLES: Record<string, { title: string; description: string }> = {
  "guia-completa": {
    title: "User manual",
    description: "Quick start, platform map, and links to topic guides.",
  },
  "guia-oficina": {
    title: "Office and jobs",
    description: "Coordinator, approve runs, My jobs, and War room.",
  },
  "guia-productos": {
    title: "Products",
    description: "Lifecycle, per-product memory, and department linking.",
  },
  "guia-departamentos": {
    title: "Departments",
    description: "Org Studio, design.md, tokens, and artifact gallery.",
  },
  "guia-equipo-ia": {
    title: "AI team and skills",
    description: "Agent catalog, skills, and Catalog Studio.",
  },
  "guia-flujos": {
    title: "Workflows and schedules",
    description: "Agent playbooks and optional timer rules.",
  },
  "como-construir-agentes": {
    title: "How to build agents",
    description: "System prompt, deliverables, docs/ folders, and correct JSON handoff.",
  },
  handoffs: {
    title: "Handoffs and flow",
    description: "All handoff types, where they are stored, and execution effects.",
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
