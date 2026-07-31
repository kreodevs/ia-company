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
  const el = findHeadingElement(id);
  if (!el) return false;

  el.scrollIntoView({ behavior: "smooth", block: "start" });
  const resolvedId = el.id || id;
  window.history.replaceState(null, "", `${window.location.pathname}#${resolvedId}`);
  return true;
}

/** Parse `#id` or `/path#id` into a decoded fragment id. */
export function extractHashId(href: string): string | null {
  const hashIndex = href.lastIndexOf("#");
  if (hashIndex === -1) return null;
  const fragment = href.slice(hashIndex + 1).trim();
  if (!fragment) return null;
  try {
    return decodeURIComponent(fragment);
  } catch {
    return fragment;
  }
}

export function isSamePageHashLink(href: string): boolean {
  if (!href.includes("#")) return false;
  if (href.startsWith("#")) return true;
  try {
    const url = new URL(href, window.location.origin);
    return url.pathname === window.location.pathname;
  } catch {
    return false;
  }
}

export function findHeadingElement(id: string): HTMLElement | null {
  const decoded = extractHashId(`#${id}`) ?? id;

  const byId = document.getElementById(decoded);
  if (byId) return byId;

  const normalizedTarget = slugifyHeading(decoded.replace(/-/g, " "));
  const candidates = document.querySelectorAll<HTMLElement>(
    "article.markdown-doc h1, article.markdown-doc h2, article.markdown-doc h3, article.markdown-doc h4",
  );

  for (const el of candidates) {
    if (el.id === decoded) return el;
    const textSlug = slugifyHeading(el.textContent ?? "");
    if (textSlug === decoded || textSlug === normalizedTarget) return el;
  }

  return null;
}
