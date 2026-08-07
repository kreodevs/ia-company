import { getOfficeEncargoDetail } from "./office-encargos.js";
import { buildProductProfilePromptSection, loadProductProfile } from "./product-profile.js";
import { buildProductWebUrlsPromptSection } from "./product-urls.js";
import {
  buildProductWebSnapshotPromptSection,
  loadOrRefreshProductWebSnapshots,
} from "./product-web-snapshot.js";
import { prisma } from "./prisma.js";

const MAX_PRIOR_REPORT_CHARS = 6_000;

export interface PriorRunContext {
  runId: string;
  title: string;
  request: string;
  workflowName: string;
  productName: string | null;
  finalReport: string;
  coordinatorBlock: string;
  memoryFields: Record<string, unknown>;
}

export async function loadPriorRunContext(
  tenantId: string,
  parentRunId: string,
): Promise<PriorRunContext | null> {
  const detail = await getOfficeEncargoDetail(tenantId, parentRunId);
  if (!detail) return null;

  const finalReport =
    detail.finalReport.length > MAX_PRIOR_REPORT_CHARS
      ? `${detail.finalReport.slice(0, MAX_PRIOR_REPORT_CHARS)}\n\n… (truncado)`
      : detail.finalReport;

  const coordinatorBlock = [
    "## Encargo anterior (corrección / continuación)",
    `- Run ID: \`${detail.id}\``,
    `- Título: **${detail.title}**`,
    `- Procedimiento: ${detail.procedureLabel} (\`${detail.workflowName}\`)`,
    detail.productName ? `- Producto: **${detail.productName}**` : "- Alcance: empresa (sin producto focal)",
    "",
    "### Solicitud original",
    detail.request.trim() || "(sin texto)",
    "",
    "### Entrega anterior (resumen)",
    finalReport.trim() || "(sin resumen — revisa documentos del run anterior)",
    "",
    "### Reglas para la corrección",
    "- El fundador pide **ajustar** el trabajo anterior, no repetirlo desde cero.",
    "- **No rehagas** análisis que el fundador marcó como incorrectos, innecesarios o ya resueltos (p. ej. pricing si ya tienen estrategia).",
    "- Incorpora fuentes externas que el fundador cite (URL, docs, pricing publicado).",
    "- En `propose_office_task`, el taskBrief debe listar explícitamente qué **excluir** y qué **corregir**.",
  ].join("\n");

  return {
    runId: detail.id,
    title: detail.title,
    request: detail.request,
    workflowName: detail.workflowName,
    productName: detail.productName,
    finalReport,
    coordinatorBlock,
    memoryFields: {
      priorRunId: detail.id,
      priorRunTitle: detail.title,
      priorRunRequest: detail.request,
      priorRunWorkflow: detail.workflowName,
      priorRunSummary: finalReport,
      revisionMode: true,
    },
  };
}

export async function buildProductContextBlock(
  tenantId: string,
  productId: string | undefined,
): Promise<string> {
  if (!productId) return "";

  const product = await prisma.tenantProduct.findFirst({
    where: { id: productId, tenantId },
    select: { name: true, description: true, githubRepoUrl: true, websiteUrl: true, pricingPageUrl: true },
  });
  if (!product) return "";

  const profile = await loadProductProfile(productId);
  const lines = [
    "## Contexto del producto (usar en el plan)",
    `- Producto: **${product.name}**`,
  ];

  if (product.description?.trim()) {
    lines.push(`- Descripción: ${product.description.trim().slice(0, 400)}`);
  }
  if (product.githubRepoUrl?.trim()) {
    lines.push(`- Repositorio: ${product.githubRepoUrl.trim()}`);
  }

  const webSection = buildProductWebUrlsPromptSection(product);
  if (webSection.trim()) {
    lines.push("", webSection);
  }

  try {
    const snapshots = await loadOrRefreshProductWebSnapshots(tenantId, productId);
    const snapshotSection = buildProductWebSnapshotPromptSection(snapshots);
    if (snapshotSection.trim()) {
      lines.push("", snapshotSection);
    }
  } catch {
    // Non-fatal: coordinator still works without web fetch
  }

  if (profile) {
    const section = buildProductProfilePromptSection(profile);
    if (section.trim()) {
      lines.push("", section);
    }
    if (profile.monetizationHypothesis?.trim()) {
      lines.push(
        "",
        "**Pricing / monetización ya definida en perfil del producto** — no propongas un workflow de pricing desde cero salvo que el fundador lo pida explícitamente.",
      );
    }
  }

  return lines.join("\n");
}
