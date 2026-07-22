import { cleanMarkdownHeading, createHeadingSlugger, slugifyHeading } from "./markdown-slug";

export const HELP_INTRO_SECTION_ID = "intro";

export interface HelpDocSection {
  id: string;
  title: string;
  level: 2 | 3;
  content: string;
  parentId?: string;
}

export interface ParsedHelpDocument {
  intro: string;
  sections: HelpDocSection[];
}

const TOC_HEADING = /^table of contents$|^tabla de contenidos$/i;

function isTocHeading(title: string): boolean {
  return TOC_HEADING.test(title);
}

export function parseHelpDocument(content: string): ParsedHelpDocument {
  const slug = createHeadingSlugger();
  const lines = content.split("\n");
  const introLines: string[] = [];
  const sections: HelpDocSection[] = [];

  let current: { level: 2 | 3; title: string; lines: string[] } | null = null;
  let lastH2Id: string | undefined;
  let startedSections = false;

  const flush = () => {
    if (!current) return;
    const id = slug(current.title);
    sections.push({
      id,
      title: current.title,
      level: current.level,
      content: current.lines.join("\n").trim(),
      parentId: current.level === 3 ? lastH2Id : undefined,
    });
    if (current.level === 2) {
      lastH2Id = id;
    }
    current = null;
  };

  for (const line of lines) {
    const h2Match = line.match(/^## (.+)$/);
    const h3Match = line.match(/^### (.+)$/);

    if (h2Match) {
      startedSections = true;
      flush();
      current = {
        level: 2,
        title: cleanMarkdownHeading(h2Match[1]),
        lines: [line],
      };
      continue;
    }

    if (h3Match) {
      startedSections = true;
      flush();
      current = {
        level: 3,
        title: cleanMarkdownHeading(h3Match[1]),
        lines: [line],
      };
      continue;
    }

    if (!startedSections) {
      introLines.push(line);
    } else if (current) {
      current.lines.push(line);
    }
  }

  flush();

  return {
    intro: introLines.join("\n").trim(),
    sections,
  };
}

export function getTocSection(sections: HelpDocSection[]): HelpDocSection | undefined {
  return sections.find((section) => isTocHeading(section.title));
}

export function findHelpSection(sections: HelpDocSection[], id: string): HelpDocSection | undefined {
  if (id === HELP_INTRO_SECTION_ID) return undefined;
  return sections.find((section) => section.id === id);
}

export function resolveSectionContent(
  parsed: ParsedHelpDocument,
  activeSectionId: string,
): string {
  if (activeSectionId === HELP_INTRO_SECTION_ID) {
    return parsed.intro;
  }

  const section = findHelpSection(parsed.sections, activeSectionId);
  return section?.content ?? parsed.intro;
}

export function getDefaultSectionId(parsed: ParsedHelpDocument): string {
  const toc = getTocSection(parsed.sections);
  if (toc) return toc.id;

  const firstH2 = parsed.sections.find((section) => section.level === 2);
  if (firstH2) return firstH2.id;

  return HELP_INTRO_SECTION_ID;
}

export function isValidSectionId(parsed: ParsedHelpDocument, id: string): boolean {
  if (id === HELP_INTRO_SECTION_ID) return parsed.intro.length > 0;
  return parsed.sections.some((section) => section.id === id);
}

/** Map legacy hash targets from the in-doc TOC links to section ids. */
export function normalizeSectionHash(hash: string, sections: HelpDocSection[]): string | null {
  const id = hash.replace(/^#/, "");
  if (!id) return null;
  if (sections.some((section) => section.id === id)) return id;
  const bySlug = sections.find((section) => slugifyHeading(section.title) === id);
  return bySlug?.id ?? null;
}
