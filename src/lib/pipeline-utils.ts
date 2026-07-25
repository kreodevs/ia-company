import type { PipelineIdea, TenantProduct } from "@prisma/client";
import { slugifyProductName } from "./product-workspace.js";

export function ideaSlugFromTitle(title: string): string {
  return slugifyProductName(title);
}

/** Stable key for deduplicating pipeline ideas (slug-first, else normalized title). */
export function normalizePipelineIdeaKey(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return "";
  const slug = slugifyProductName(trimmed);
  if (slug) return slug;
  return trimmed.toLowerCase().replace(/\s+/g, " ");
}

export function filterNewPipelineIdeas(
  incoming: Array<{ title: string; description?: string; interestScore?: number }>,
  existingTitles: string[],
  products: TenantProduct[],
): Array<{ title: string; description?: string; interestScore?: number }> {
  const seen = new Set<string>();

  for (const title of existingTitles) {
    const key = normalizePipelineIdeaKey(title);
    if (key) seen.add(key);
  }
  for (const product of products) {
    seen.add(normalizePipelineIdeaKey(product.name));
    if (product.slug) seen.add(product.slug);
  }

  const out: typeof incoming = [];
  for (const idea of incoming) {
    const key = normalizePipelineIdeaKey(idea.title);
    if (!key || seen.has(key)) continue;
    if (findProductForIdea(idea, products)) continue;
    seen.add(key);
    out.push(idea);
  }
  return out;
}

export function findProductForIdea(
  idea: Pick<PipelineIdea, "title">,
  products: TenantProduct[],
): TenantProduct | undefined {
  const ideaTitle = idea.title.trim();
  const ideaTitleLower = ideaTitle.toLowerCase();
  const ideaSlug = ideaSlugFromTitle(ideaTitle);

  return products.find((product) => {
    const nameLower = product.name.toLowerCase();
    if (nameLower === ideaTitleLower) return true;
    if (ideaTitleLower.startsWith(`${nameLower} `) || ideaTitleLower.startsWith(`${nameLower}(`)) {
      return true;
    }
    if (ideaSlug && product.slug === ideaSlug) return true;
    if (ideaSlug && ideaSlug.startsWith(product.slug)) return true;
    if (ideaSlug && product.slug.startsWith(ideaSlug.split("-")[0] ?? "")) return true;
    return false;
  });
}

/** Ideas still awaiting human decision or agent evaluation (hide once a product exists). */
export function filterActionablePipelineIdeas(
  ideas: PipelineIdea[],
  products: TenantProduct[],
): PipelineIdea[] {
  return ideas.filter((idea) => {
    if (idea.goNoGo === "no_go") return false;
    return !findProductForIdea(idea, products);
  });
}

export function findIdeaToEvaluate(
  ideas: PipelineIdea[],
  products: TenantProduct[],
): PipelineIdea | undefined {
  const actionable = filterActionablePipelineIdeas(ideas, products);
  return actionable.find((idea) => idea.goNoGo === "go") ?? actionable.find((idea) => idea.goNoGo === "pending");
}
