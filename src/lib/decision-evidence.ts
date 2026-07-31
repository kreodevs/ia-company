import {
  documentMatchesReferencedPath,
  extractReferencedDocPath,
} from "./referenced-doc-path.js";

export interface EvidenceLinkedDocument {
  agentName: string;
  kind: "revision" | "step" | "file";
  markdown: string;
  path?: string;
}

export function pickDocumentForAgent<T extends EvidenceLinkedDocument>(
  documents: T[],
  agent: string,
  summary?: string,
): T | null {
  const referencedPath = summary?.trim() ? extractReferencedDocPath(summary) : null;

  if (referencedPath) {
    const byPath = documents.find(
      (doc) => doc.path && documentMatchesReferencedPath(doc.path, referencedPath),
    );
    if (byPath) return byPath;
    return null;
  }

  const forAgent = documents.filter((d) => d.agentName === agent);
  if (forAgent.length === 0) return null;
  const fileDocs = forAgent.filter((d) => d.kind === "file");
  const pool = fileDocs.length > 0 ? fileDocs : forAgent;
  return pool.sort((a, b) => b.markdown.length - a.markdown.length)[0] ?? null;
}
