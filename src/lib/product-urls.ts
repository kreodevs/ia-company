/** Normalize optional http(s) URLs for product website / pricing fields. */
export function normalizeProductUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function assertValidProductUrlField(
  label: string,
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const normalized = normalizeProductUrl(trimmed);
  if (!normalized) {
    throw new Error(`Invalid ${label} URL`);
  }
  return normalized;
}

export function buildProductWebUrlsPromptSection(input: {
  websiteUrl?: string | null;
  pricingPageUrl?: string | null;
}): string {
  const lines: string[] = [];
  if (input.websiteUrl?.trim()) {
    lines.push(`- **Sitio web del producto:** ${input.websiteUrl.trim()}`);
  }
  if (input.pricingPageUrl?.trim()) {
    lines.push(`- **Página de pricing (fuente autoritativa):** ${input.pricingPageUrl.trim()}`);
    lines.push(
      "  Si el encargo toca monetización o precios, **usa esta URL como referencia** — no inventes tiers ni montos distintos salvo que el fundador pida revisarlos.",
    );
  }
  if (lines.length === 0) return "";
  return ["### Presencia web del producto", ...lines].join("\n");
}
