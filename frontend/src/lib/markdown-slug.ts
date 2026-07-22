import type { ReactNode } from "react";
import { isValidElement } from "react";

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

export function createHeadingSlugger() {
  const counts = new Map<string, number>();
  return (text: string) => {
    const base = slugifyHeading(text);
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen}`;
  };
}

export function getNodeText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getNodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getNodeText(node.props.children);
  }
  return "";
}

export function cleanMarkdownHeading(raw: string): string {
  return raw
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

const TOC_HEADING = /^table of contents$|^tabla de contenidos$/i;

export interface DocumentHeading {
  id: string;
  title: string;
  level: number;
}

export function extractDocumentHeadings(content: string): DocumentHeading[] {
  const slug = createHeadingSlugger();
  const headings: DocumentHeading[] = [];

  for (const line of content.split("\n")) {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (!match) continue;

    const level = match[1].length;
    const title = cleanMarkdownHeading(match[2]);
    if (TOC_HEADING.test(title)) continue;

    headings.push({ id: slug(title), title, level });
  }

  return headings;
}

export function getTocHeadingId(lang: string): string {
  return slugifyHeading(lang.startsWith("en") ? "Table of contents" : "Tabla de contenidos");
}

export function scrollToHeading(id: string): boolean {
  const el = document.getElementById(id);
  if (!el) return false;

  el.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.replaceState(null, "", `${window.location.pathname}#${id}`);
  return true;
}
