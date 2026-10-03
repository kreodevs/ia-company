import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, CheckCheck, MessageSquarePlus, X } from "lucide-react";
import {
  api,
  type DocumentReviewStatus,
  type OfficeDocumentReview,
  type OfficeEncargoDocument,
} from "../../lib/api";
import Button from "../ui/Button";
import StatusPill from "../ui/StatusPill";

interface Props {
  runId: string;
  document: OfficeEncargoDocument | null;
  versionSha?: string | null;
}

/** Clave canónica del documento: file:<path> | rev:<id> | step:<id>. */
export function documentReviewKey(doc: OfficeEncargoDocument | null): string {
  if (!doc) return "";
  if (doc.docKey) return doc.docKey;
  if (doc.kind === "file" && doc.path) return `file:${doc.path}`;
  return `${doc.kind === "revision" ? "rev" : "step"}:${doc.id.replace(/^step-/, "")}`;
}

function pillFor(status: DocumentReviewStatus): string {
  if (status === "approved") return "completed";
  if (status === "rejected") return "cancelled";
  if (status === "changes_requested") return "running";
  return "pending";
}

export default function DocumentReviewPanel({ runId, document, versionSha }: Props) {
  const { t } = useTranslation();
  const docKey = useMemo(() => documentReviewKey(document), [document]);
  const [reviews, setReviews] = useState<OfficeDocumentReview[]>([]);
  const [busy, setBusy] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [anchorHeading, setAnchorHeading] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!docKey) return;
    try {
      const data = await api.office.runReviews(runId, docKey);
      setReviews(data.reviews);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
    }
  }, [runId, docKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const latest = reviews[0] ?? null;
  const openComments = latest?.comments.filter((c) => c.status === "open") ?? [];

  const setStatus = async (status: DocumentReviewStatus) => {
    if (!docKey) return;
    setBusy(true);
    try {
      await api.office.upsertReview(runId, {
        docKey,
        docPath: document?.path,
        versionSha: versionSha ?? document?.verifiedCommitSha ?? undefined,
        status,
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const submitComment = async () => {
    if (!latest || !commentBody.trim()) return;
    setBusy(true);
    try {
      await api.office.addReviewComment(runId, latest.id, {
        body: commentBody.trim(),
        anchor: anchorHeading.trim()
          ? { kind: "section", heading: anchorHeading.trim() }
          : { kind: "document" },
      });
      setCommentBody("");
      setAnchorHeading("");
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (!document) {
    return <p className="office-review-empty">{t("office.review.selectDocument")}</p>;
  }

  return (
    <section className="office-panel office-review-panel" id={`doc-${encodeURIComponent(docKey)}`}>
      <div className="office-review-head">
        <h2 className="office-panel-title">
          <MessageSquarePlus className="h-4 w-4" aria-hidden />
          {t("office.review.title")}
        </h2>
        {latest ? (
          <StatusPill status={pillFor(latest.status)}>
            {t(`office.review.status.${latest.status}`)}
          </StatusPill>
        ) : null}
      </div>
      <p className="office-panel-subtitle">
        {t("office.review.subtitle")} · <code>{docKey}</code>
        {versionSha ?? document.verifiedCommitSha ? (
          <>
            {" "}
            · SHA <code>{(versionSha ?? document.verifiedCommitSha ?? "").slice(0, 8)}</code>
          </>
        ) : null}
      </p>

      <div className="office-review-actions">
        <Button size="sm" disabled={busy} onClick={() => void setStatus("pending_review")}>
          {t("office.review.request")}
        </Button>
        <Button size="sm" disabled={busy} onClick={() => void setStatus("changes_requested")}>
          <X className="mr-1 h-3.5 w-3.5" aria-hidden />
          {t("office.review.requestChanges")}
        </Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => void setStatus("approved")}>
          <Check className="mr-1 h-3.5 w-3.5" aria-hidden />
          {t("office.review.approve")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => void setStatus("rejected")}
        >
          {t("office.review.reject")}
        </Button>
      </div>

      {error ? <p className="office-review-error">{error}</p> : null}

      {latest ? (
        <>
          <ul className="office-review-comments">
            {latest.comments.map((comment) => (
              <li key={comment.id} className="office-review-comment" data-status={comment.status}>
                <div className="office-review-comment-head">
                  <span className="office-review-comment-anchor">
                    {comment.anchor.heading ?? comment.anchor.kind ?? "documento"}
                    {comment.anchor.line ? `:L${comment.anchor.line}` : ""}
                  </span>
                  <span className="office-review-comment-status">
                    {t(`office.review.commentStatus.${comment.status}`)}
                  </span>
                  {comment.versionSha ? (
                    <span className="office-review-comment-version">
                      {comment.versionSha.slice(0, 8)}
                    </span>
                  ) : null}
                </div>
                <p className="office-review-comment-body">{comment.body}</p>
                <div className="office-review-comment-actions">
                  <button
                    type="button"
                    className="office-link-btn office-link-btn-muted"
                    disabled={busy || comment.status !== "open"}
                    onClick={() =>
                      void api.office
                        .resolveReviewComment(runId, comment.id)
                        .then(load)
                        .finally(() => undefined)
                    }
                  >
                    <CheckCheck className="mr-1 h-3.5 w-3.5" aria-hidden />
                    {t("office.review.resolveComment")}
                  </button>
                  <button
                    type="button"
                    className="office-link-btn office-link-btn-muted"
                    disabled={busy || comment.status !== "open"}
                    onClick={() =>
                      void api.office
                        .convertReviewComment(runId, comment.id, {
                          title: t("office.review.workFromComment", { docKey }),
                        })
                        .then(load)
                        .finally(() => undefined)
                    }
                  >
                    {t("office.review.convertToWork")}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="office-review-composer">
            <input
              className="office-review-anchor-input"
              value={anchorHeading}
              onChange={(e) => setAnchorHeading(e.target.value)}
              placeholder={t("office.review.anchorPlaceholder")}
            />
            <textarea
              className="office-review-comment-input"
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder={t("office.review.commentPlaceholder")}
              rows={3}
            />
            <Button size="sm" disabled={busy || !commentBody.trim()} onClick={() => void submitComment()}>
              {t("office.review.addComment")}
            </Button>
          </div>
          {openComments.length > 0 ? (
            <p className="office-review-open-note">
              {t("office.review.openComments", { count: openComments.length })}
            </p>
          ) : null}
        </>
      ) : (
        <p className="office-review-empty">{t("office.review.noReview")}</p>
      )}
    </section>
  );
}