const TOC_SECTION = /^table of contents$|^tabla de contenidos$/i;

export function hasHelpTableOfContents(content: string): boolean {
  return /^## (Tabla de contenidos|Table of contents)\s*$/im.test(content);
}

/** Append a “back to TOC” blockquote before section separators (after each ## block except TOC). */
export function injectHelpBackToTocLinks(content: string, tocId: string, label: string): string {
  if (!hasHelpTableOfContents(content)) return content;

  const linkLine = `> [↑ ${label}](#${tocId})`;
  const lines = content.split("\n");
  const out: string[] = [];
  let inSection = false;
  let isTocSection = false;
  let sectionHasContent = false;

  const flushLink = () => {
    if (!inSection || isTocSection || !sectionHasContent) return;

    while (out.length > 0 && out[out.length - 1]?.trim() === "") out.pop();
    const hadSeparator = out.length > 0 && out[out.length - 1]?.trim() === "---";
    if (hadSeparator) out.pop();
    while (out.length > 0 && out[out.length - 1]?.trim() === "") out.pop();

    out.push("");
    out.push(linkLine);
    out.push("");
    if (hadSeparator) {
      out.push("---");
      out.push("");
    }
  };

  for (const line of lines) {
    const h2 = line.match(/^## (.+)$/);

    if (h2) {
      flushLink();
      isTocSection = TOC_SECTION.test(h2[1].trim());
      inSection = true;
      sectionHasContent = false;
      out.push(line);
      continue;
    }

    if (inSection && !isTocSection && line.trim() !== "" && line.trim() !== "---") {
      sectionHasContent = true;
    }

    out.push(line);
  }

  flushLink();
  return out.join("\n");
}
