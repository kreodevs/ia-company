const BACKTICK_DOC_PATH = /`(docs\/[\w./_-]+\.(?:md|markdown|mdx))`/gi;
const PLAIN_DOC_PATH = /\b(docs\/[\w./_-]+\.(?:md|markdown|mdx))\b/gi;

export function normalizeDocPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

/** All docs/… paths mentioned in agent output or evidence summary. */
export function extractReferencedDocPaths(text: string): string[] {
  const paths = new Set<string>();
  for (const pattern of [BACKTICK_DOC_PATH, PLAIN_DOC_PATH]) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const raw = match[1];
      if (raw) paths.add(normalizeDocPath(raw));
    }
  }
  return [...paths];
}

/** Primary deliverable path cited in evidence (first docs/… match). */
export function extractReferencedDocPath(text: string): string | null {
  return extractReferencedDocPaths(text)[0] ?? null;
}

export function documentMatchesReferencedPath(
  docPath: string | undefined,
  referencedPath: string,
): boolean {
  if (!docPath?.trim()) return false;
  const normalizedDoc = normalizeDocPath(docPath);
  const normalizedRef = normalizeDocPath(referencedPath);
  if (normalizedDoc === normalizedRef) return true;
  const refBase = normalizedRef.split("/").pop();
  const docBase = normalizedDoc.split("/").pop();
  return Boolean(refBase && docBase && refBase === docBase);
}
