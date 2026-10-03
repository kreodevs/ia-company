/**
 * Reingeniería 2, Fase G — revisión de documentos con comentarios anclados.
 * `DocumentReview` es la fuente de verdad del estado de revisión por
 * documento-versión; `DocumentComment` guarda comentarios ligados a versión.
 */
import { CommentStatus, DocumentReviewStatus, Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { DepartmentWorkStatus } from "@prisma/client";
import { createTenantNotification } from "./tenant-notifications.js";

export interface DocumentReviewDto {
  id: string;
  runId: string;
  docKey: string;
  docPath: string | null;
  versionSha: string | null;
  status: DocumentReviewStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  comments: Array<{
    id: string;
    anchor: { kind?: string; heading?: string | null; line?: number | null; quote?: string | null };
    body: string;
    authorUserId: string | null;
    authorAgentName: string | null;
    versionSha: string | null;
    status: CommentStatus;
    linkedWorkItemId: string | null;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentReviewSummary {
  id: string;
  runId: string;
  docKey: string;
  status: DocumentReviewStatus;
  versionSha: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const REVIEW_STATUSES: DocumentReviewStatus[] = [
  DocumentReviewStatus.pending_review,
  DocumentReviewStatus.changes_requested,
  DocumentReviewStatus.approved,
  DocumentReviewStatus.rejected,
];

function parseAnchor(value: Prisma.JsonValue): DocumentReviewDto["comments"][number]["anchor"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const anchor = value as Record<string, unknown>;
  return {
    kind: typeof anchor.kind === "string" ? anchor.kind : undefined,
    heading: typeof anchor.heading === "string" ? anchor.heading : null,
    line: typeof anchor.line === "number" ? anchor.line : null,
    quote: typeof anchor.quote === "string" ? anchor.quote : null,
  };
}

export async function listDocumentReviews(
  tenantId: string,
  runId: string,
  options: { docKey?: string } = {},
): Promise<DocumentReviewDto[]> {
  const reviews = await prisma.documentReview.findMany({
    where: {
      tenantId,
      runId,
      ...(options.docKey ? { docKey: options.docKey } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: { comments: { orderBy: { createdAt: "asc" } } },
  });
  return reviews.map((review) => ({
    id: review.id,
    runId: review.runId,
    docKey: review.docKey,
    docPath: review.docPath,
    versionSha: review.versionSha,
    status: review.status,
    resolvedBy: review.resolvedBy,
    resolvedAt: review.resolvedAt?.toISOString() ?? null,
    comments: review.comments.map((comment) => ({
      id: comment.id,
      anchor: parseAnchor(comment.anchor),
      body: comment.body,
      authorUserId: comment.authorUserId,
      authorAgentName: comment.authorAgentName,
      versionSha: comment.versionSha,
      status: comment.status,
      linkedWorkItemId: comment.linkedWorkItemId,
      createdAt: comment.createdAt.toISOString(),
    })),
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  }));
}

export async function upsertDocumentReview(params: {
  tenantId: string;
  runId: string;
  docKey: string;
  docPath?: string | null;
  versionSha?: string | null;
  status: DocumentReviewStatus;
  actor: string | null;
}): Promise<DocumentReviewDto | null> {
  if (!REVIEW_STATUSES.includes(params.status)) return null;
  const run = await prisma.executionRun.findFirst({
    where: { id: params.runId, tenantId: params.tenantId },
    select: { id: true },
  });
  if (!run) return null;

  const existing = await prisma.documentReview.findUnique({
    where: {
      tenantId_runId_docKey_versionSha: {
        tenantId: params.tenantId,
        runId: params.runId,
        docKey: params.docKey,
        versionSha: params.versionSha ?? "",
      },
    },
  });

  const resolved = params.status === DocumentReviewStatus.approved || params.status === DocumentReviewStatus.rejected;

  const review = existing
    ? await prisma.documentReview.update({
        where: { id: existing.id },
        data: {
          status: params.status,
          resolvedBy: resolved ? params.actor : undefined,
          resolvedAt: resolved ? new Date() : undefined,
        },
        include: { comments: { orderBy: { createdAt: "asc" } } },
      })
    : await prisma.documentReview.create({
        data: {
          tenantId: params.tenantId,
          runId: params.runId,
          docKey: params.docKey,
          docPath: params.docPath ?? null,
          versionSha: params.versionSha ?? null,
          status: params.status,
          resolvedBy: resolved ? params.actor : null,
          resolvedAt: resolved ? new Date() : null,
        },
        include: { comments: { orderBy: { createdAt: "asc" } } },
      });

  await createTenantNotification({
    tenantId: params.tenantId,
    type: "doc_review_pending",
    title: params.status === DocumentReviewStatus.changes_requested ? "Revisión de documento solicitada" : "Documento revisado",
    body: `Documento ${params.docKey}: ${params.status}`,
    href: `/office/encargos/${params.runId}`,
    runId: params.runId,
  });

  return {
    id: review.id,
    runId: review.runId,
    docKey: review.docKey,
    docPath: review.docPath,
    versionSha: review.versionSha,
    status: review.status,
    resolvedBy: review.resolvedBy,
    resolvedAt: review.resolvedAt?.toISOString() ?? null,
    comments: review.comments.map((comment) => ({
      id: comment.id,
      anchor: parseAnchor(comment.anchor),
      body: comment.body,
      authorUserId: comment.authorUserId,
      authorAgentName: comment.authorAgentName,
      versionSha: comment.versionSha,
      status: comment.status,
      linkedWorkItemId: comment.linkedWorkItemId,
      createdAt: comment.createdAt.toISOString(),
    })),
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}

export async function addDocumentComment(params: {
  tenantId: string;
  reviewId: string;
  body: string;
  anchor?: { kind?: string; heading?: string | null; line?: number | null; quote?: string | null };
  authorUserId?: string | null;
  authorAgentName?: string | null;
  versionSha?: string | null;
}): Promise<DocumentReviewDto | null> {
  const review = await prisma.documentReview.findFirst({
    where: { id: params.reviewId, tenantId: params.tenantId },
  });
  if (!review) return null;
  await prisma.documentComment.create({
    data: {
      tenantId: params.tenantId,
      reviewId: review.id,
      runId: review.runId,
      docKey: review.docKey,
      anchor: (params.anchor ?? {}) as Prisma.InputJsonValue,
      body: params.body,
      authorUserId: params.authorUserId ?? null,
      authorAgentName: params.authorAgentName ?? null,
      versionSha: params.versionSha ?? review.versionSha,
    },
  });
  const refreshed = await prisma.documentReview.findUnique({
    where: { id: review.id },
    include: { comments: { orderBy: { createdAt: "asc" } } },
  });
  if (!refreshed) return null;
  return {
    id: refreshed.id,
    runId: refreshed.runId,
    docKey: refreshed.docKey,
    docPath: refreshed.docPath,
    versionSha: refreshed.versionSha,
    status: refreshed.status,
    resolvedBy: refreshed.resolvedBy,
    resolvedAt: refreshed.resolvedAt?.toISOString() ?? null,
    comments: refreshed.comments.map((comment) => ({
      id: comment.id,
      anchor: parseAnchor(comment.anchor),
      body: comment.body,
      authorUserId: comment.authorUserId,
      authorAgentName: comment.authorAgentName,
      versionSha: comment.versionSha,
      status: comment.status,
      linkedWorkItemId: comment.linkedWorkItemId,
      createdAt: comment.createdAt.toISOString(),
    })),
    createdAt: refreshed.createdAt.toISOString(),
    updatedAt: refreshed.updatedAt.toISOString(),
  };
}

/** Convierte un comentario en trabajo departamental trazable. */
export async function convertCommentToWorkItem(params: {
  tenantId: string;
  commentId: string;
  title?: string;
  ownerAgentName?: string | null;
  departmentSlug?: string | null;
}): Promise<{ workItemId: string; commentId: string } | null> {
  const comment = await prisma.documentComment.findFirst({
    where: { id: params.commentId, tenantId: params.tenantId },
    include: { review: { select: { runId: true, docKey: true } } },
  });
  if (!comment || comment.status === CommentStatus.converted) return null;

  const workItem = await prisma.departmentWorkItem.create({
    data: {
      tenantId: params.tenantId,
      runId: comment.review.runId,
      departmentSlug: params.departmentSlug ?? "product",
      ownerAgentName: params.ownerAgentName ?? null,
      title: params.title ?? `Revisión: ${comment.body.slice(0, 60)}`,
      objective: comment.body,
      status: DepartmentWorkStatus.planned,
      businessStatus: "Planificando",
      nextAction: `Atender comentario en ${comment.docKey}`,
    },
  });

  await prisma.documentComment.update({
    where: { id: comment.id },
    data: { status: CommentStatus.converted, linkedWorkItemId: workItem.id },
  });

  return { workItemId: workItem.id, commentId: comment.id };
}

export async function resolveDocumentComment(params: {
  tenantId: string;
  commentId: string;
}): Promise<DocumentReviewDto | null> {
  const comment = await prisma.documentComment.findFirst({
    where: { id: params.commentId, tenantId: params.tenantId },
    select: { reviewId: true },
  });
  if (!comment) return null;
  await prisma.documentComment.update({
    where: { id: params.commentId },
    data: { status: CommentStatus.resolved },
  });
  const refreshed = await prisma.documentReview.findUnique({
    where: { id: comment.reviewId },
    include: { comments: { orderBy: { createdAt: "asc" } } },
  });
  if (!refreshed) return null;
  return {
    id: refreshed.id,
    runId: refreshed.runId,
    docKey: refreshed.docKey,
    docPath: refreshed.docPath,
    versionSha: refreshed.versionSha,
    status: refreshed.status,
    resolvedBy: refreshed.resolvedBy,
    resolvedAt: refreshed.resolvedAt?.toISOString() ?? null,
    comments: refreshed.comments.map((entry) => ({
      id: entry.id,
      anchor: parseAnchor(entry.anchor),
      body: entry.body,
      authorUserId: entry.authorUserId,
      authorAgentName: entry.authorAgentName,
      versionSha: entry.versionSha,
      status: entry.status,
      linkedWorkItemId: entry.linkedWorkItemId,
      createdAt: entry.createdAt.toISOString(),
    })),
    createdAt: refreshed.createdAt.toISOString(),
    updatedAt: refreshed.updatedAt.toISOString(),
  };
}
