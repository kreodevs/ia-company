import type { PublicDeliveryPayload } from "./encargo-delivery.js";
import type { TenantDeliveryBrandingDto } from "./tenant-delivery-branding.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markdownToSimpleHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const parts: string[] = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) {
        parts.push("</ul>");
        inList = false;
      }
      continue;
    }
    if (trimmed.startsWith("### ")) {
      if (inList) {
        parts.push("</ul>");
        inList = false;
      }
      parts.push(`<h3>${escapeHtml(trimmed.slice(4))}</h3>`);
    } else if (trimmed.startsWith("## ")) {
      if (inList) {
        parts.push("</ul>");
        inList = false;
      }
      parts.push(`<h2>${escapeHtml(trimmed.slice(3))}</h2>`);
    } else if (trimmed.startsWith("# ")) {
      if (inList) {
        parts.push("</ul>");
        inList = false;
      }
      parts.push(`<h1>${escapeHtml(trimmed.slice(2))}</h1>`);
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) {
        parts.push("<ul>");
        inList = true;
      }
      parts.push(`<li>${escapeHtml(trimmed.slice(2))}</li>`);
    } else {
      if (inList) {
        parts.push("</ul>");
        inList = false;
      }
      parts.push(`<p>${escapeHtml(trimmed)}</p>`);
    }
  }
  if (inList) parts.push("</ul>");
  return parts.join("\n");
}

export function buildDeliveryExportHtml(
  payload: PublicDeliveryPayload,
  branding: TenantDeliveryBrandingDto,
): string {
  const primary = branding.primaryColor || "#2563eb";
  const title = payload.encargo.title;
  const sections: string[] = [];

  if (payload.finalReport) {
    sections.push(
      `<section class="delivery-section"><h2>Resumen</h2>${markdownToSimpleHtml(payload.finalReport)}</section>`,
    );
  }
  for (const doc of payload.documents) {
    sections.push(
      `<section class="delivery-section"><h2>${escapeHtml(doc.title)}</h2><p class="doc-meta">${escapeHtml(doc.agentName)}</p>${markdownToSimpleHtml(doc.markdown)}</section>`,
    );
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>${escapeHtml(title)} — ${escapeHtml(branding.tenantName)}</title>
  <style>
    :root { --primary: ${primary}; }
    body { font-family: Georgia, "Times New Roman", serif; line-height: 1.65; color: #1e293b; max-width: 48rem; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
    header { border-bottom: 3px solid var(--primary); padding-bottom: 1rem; margin-bottom: 2rem; }
    .brand { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
    .brand img { max-height: 2.5rem; }
    .brand-name { font-family: system-ui, sans-serif; font-size: 0.875rem; font-weight: 600; color: var(--primary); text-transform: uppercase; letter-spacing: 0.06em; }
    h1 { font-size: 1.75rem; margin: 0.25rem 0; }
    .meta { font-family: system-ui, sans-serif; font-size: 0.875rem; color: #64748b; }
    .delivery-section { margin-bottom: 2rem; page-break-inside: avoid; }
    .delivery-section h2 { font-size: 1.25rem; color: var(--primary); border-bottom: 1px solid #e2e8f0; padding-bottom: 0.35rem; }
    .doc-meta { font-family: system-ui, sans-serif; font-size: 0.8125rem; color: #64748b; }
    footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; font-family: system-ui, sans-serif; font-size: 0.8125rem; color: #64748b; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      ${branding.logoUrl ? `<img src="${escapeHtml(branding.logoUrl)}" alt="" />` : ""}
      <span class="brand-name">${escapeHtml(branding.tenantName)}</span>
    </div>
    <h1>${escapeHtml(title)}</h1>
    ${payload.label ? `<p class="meta">${escapeHtml(payload.label)}</p>` : ""}
    <p class="meta">${escapeHtml(payload.encargo.procedureLabel)}${payload.encargo.completedAt ? ` · ${escapeHtml(new Date(payload.encargo.completedAt).toLocaleDateString())}` : ""}</p>
  </header>
  ${sections.join("\n")}
  <footer>${escapeHtml(branding.footerText ?? "")}</footer>
  <script>window.onload = () => { if (new URLSearchParams(location.search).get('print') === '1') window.print(); };</script>
</body>
</html>`;
}

export function buildDeliveryMarkdownBundle(payload: PublicDeliveryPayload): string {
  const parts: string[] = [`# ${payload.encargo.title}`, ""];
  if (payload.label) parts.push(`> ${payload.label}`, "");
  parts.push(`**Procedimiento:** ${payload.encargo.procedureLabel}`, "");
  if (payload.finalReport) {
    parts.push("---", "", "## Resumen", "", payload.finalReport, "");
  }
  for (const doc of payload.documents) {
    parts.push("---", "", `## ${doc.title}`, "", `*${doc.agentName}*`, "", doc.markdown, "");
  }
  return parts.join("\n");
}
