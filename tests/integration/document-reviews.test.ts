/**
 * Reingeniería 2, Corte 2 (Fase G) — Revisión de documentos (integración DB).
 * Requiere DATABASE_URL.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { CommentStatus, DocumentReviewStatus } from "@prisma/client";
import { prisma } from "../../src/lib/prisma.js";
import {
  listDocumentReviews,
  upsertDocumentReview,
  addDocumentComment,
  resolveDocumentComment,
  convertCommentToWorkItem,
} from "../../src/lib/document-reviews.js";

const hasDb = Boolean(process.env.DATABASE_URL);

test(
  "document reviews: CRUD + comments + resolve + convert",
  { skip: !hasDb },
  async () => {
    const stamp = Date.now();
    const tenant = await prisma.tenant.create({
      data: { name: `docrev-${stamp}`, slug: `docrev-${stamp}` },
    });

    try {
      const run = await prisma.executionRun.create({
        data: {
          tenantId: tenant.id,
          status: "RUNNING",
          engine: "session",
          sharedMemory: {
            teamAgents: ["product-norman", "cto-vogels"],
            officeRequest: "Doc review test",
            task: "Doc review test",
          },
        },
      });

      const docKey = "file:spec.md";

      // 1) Crear revisión pendiente
      const review1 = await upsertDocumentReview({
        tenantId: tenant.id,
        runId: run.id,
        docKey,
        docPath: "spec.md",
        versionSha: "v1",
        status: DocumentReviewStatus.pending_review,
        actor: "product-norman",
      });
      assert.ok(review1);
      assert.equal(review1.status, DocumentReviewStatus.pending_review);
      assert.equal(review1.docKey, docKey);
      assert.equal(review1.versionSha, "v1");

      // 2) Añadir comentario con ancla (addDocumentComment devuelve el review refrescado)
      const withComment = await addDocumentComment({
        tenantId: tenant.id,
        reviewId: review1.id,
        body: "Falta sección de métricas",
        anchor: { kind: "heading", heading: "Métricas", line: 12, quote: "## Métricas" },
        authorUserId: "user-1",
        authorAgentName: null,
        versionSha: "v1",
      });
      assert.ok(withComment);
      assert.equal(withComment.comments.length, 1);
      assert.equal(withComment.comments[0].body, "Falta sección de métricas");
      assert.equal(withComment.comments[0].status, CommentStatus.open);
      const commentId = withComment.comments[0].id;

      // 3) Listar revisiones
      const reviews = await listDocumentReviews(tenant.id, run.id, { docKey });
      assert.equal(reviews.length, 1);
      assert.equal(reviews[0].comments.length, 1);

      // 4) Solicitar cambios (misma versión: actualiza)
      const changed = await upsertDocumentReview({
        tenantId: tenant.id,
        runId: run.id,
        docKey,
        docPath: "spec.md",
        versionSha: "v1",
        status: DocumentReviewStatus.changes_requested,
        actor: "cto-vogels",
      });
      assert.ok(changed);
      assert.equal(changed.id, review1.id);
      assert.equal(changed.status, DocumentReviewStatus.changes_requested);

      // 5) Resolver comentario
      const resolvedReview = await resolveDocumentComment({
        tenantId: tenant.id,
        commentId,
      });
      assert.ok(resolvedReview);
      const resolvedComment = resolvedReview.comments.find((c) => c.id === commentId);
      assert.equal(resolvedComment?.status, CommentStatus.resolved);

      // 6) Convertir comentario en trabajo
      const converted = await convertCommentToWorkItem({
        tenantId: tenant.id,
        commentId,
        title: "Añadir métricas",
        departmentSlug: "product",
      });
      assert.ok(converted);
      assert.equal(converted.commentId, commentId);
      assert.ok(converted.workItemId);

      // 6b) El comentario queda marcado como converted
      const after = await listDocumentReviews(tenant.id, run.id, { docKey });
      const convComment = after[0].comments.find((c) => c.id === commentId);
      assert.equal(convComment?.status, CommentStatus.converted);
      assert.equal(convComment?.linkedWorkItemId, converted.workItemId);

      // 7) Verificar work item creado
      const workItem = await prisma.departmentWorkItem.findUnique({
        where: { id: converted.workItemId },
      });
      assert.ok(workItem);
      assert.equal(workItem.title, "Añadir métricas");
      assert.equal(workItem.departmentSlug, "product");

      // 8) Aprobar revisión (nueva versión del doc: crea segunda fila)
      const reviewApproved = await upsertDocumentReview({
        tenantId: tenant.id,
        runId: run.id,
        docKey,
        docPath: "spec.md",
        versionSha: "v2",
        status: DocumentReviewStatus.approved,
        actor: "cto-vogels",
      });
      assert.ok(reviewApproved);
      assert.notEqual(reviewApproved.id, review1.id);
      assert.equal(reviewApproved.status, DocumentReviewStatus.approved);
      assert.equal(reviewApproved.versionSha, "v2");

      // 9) Múltiples versiones: la original sigue existiendo
      const allReviews = await listDocumentReviews(tenant.id, run.id, { docKey });
      assert.equal(allReviews.length, 2);
      assert.ok(allReviews.some((r) => r.versionSha === "v1"));
      assert.ok(allReviews.some((r) => r.versionSha === "v2"));
    } finally {
      await prisma.tenantNotification.deleteMany({ where: { tenantId: tenant.id } }).catch(() => undefined);
      await prisma.documentComment.deleteMany({ where: { review: { tenantId: tenant.id } } }).catch(() => undefined);
      await prisma.documentReview.deleteMany({ where: { tenantId: tenant.id } }).catch(() => undefined);
      await prisma.departmentWorkItem.deleteMany({ where: { tenantId: tenant.id } }).catch(() => undefined);
      await prisma.executionRun.deleteMany({ where: { tenantId: tenant.id } }).catch(() => undefined);
      await prisma.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
    }
  },
);