import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, CheckCircle2, ClipboardList, HelpCircle, Send, XCircle } from "lucide-react";
import { api, type OfficeDepartmentWorkMap, type OfficeDepartmentHandoff } from "../../lib/api";
import Button from "../ui/Button";

function deptLabel(slug: string | null, t: (k: string, o?: Record<string, unknown>) => string): string {
  if (!slug) return "—";
  if (slug === "custom") return t("office.workMap.handoff.customDept", { defaultValue: "Equipo" }) as string;
  return t(`office.departments.${slug}.name`, { defaultValue: slug }) as string;
}

function NewHandoffForm({
  runId,
  items,
  sourceId,
  onDone,
}: {
  runId: string;
  items: OfficeDepartmentWorkMap["items"];
  sourceId: string;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [toId, setToId] = useState("");
  const [message, setMessage] = useState("");
  const [questions, setQuestions] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!toId || !message.trim() || busy) return;
    setBusy(true);
    try {
      const openQuestions = questions
        .split("\n")
        .map((q) => q.trim())
        .filter(Boolean);
      await api.office.createHandoff(runId, {
        fromWorkItemId: sourceId,
        toWorkItemId: toId,
        message: message.trim(),
        openQuestions,
      });
      onDone();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="office-workmap-handoff-form">
      <label>
        <span>{t("office.workMap.handoff.target")}</span>
        <select value={toId} onChange={(e) => setToId(e.target.value)}>
          <option value="">—</option>
          {items
            .filter((i) => i.id !== sourceId)
            .map((i) => (
              <option key={i.id} value={i.id}>
                {deptLabel(i.departmentSlug, t)} — {i.title}
              </option>
            ))}
        </select>
      </label>
      <label>
        <span>{t("office.workMap.handoff.message")}</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("office.workMap.handoff.messagePh") as string}
          rows={2}
        />
      </label>
      <label>
        <span>{t("office.workMap.handoff.openQuestions")}</span>
        <textarea
          value={questions}
          onChange={(e) => setQuestions(e.target.value)}
          placeholder={t("office.workMap.handoff.openQuestionsPh") as string}
          rows={2}
        />
      </label>
      <Button onClick={send} disabled={!toId || !message.trim() || busy}>
        <Send size={14} /> {busy ? t("office.workMap.handoff.sending") : t("office.workMap.handoff.send")}
      </Button>
    </div>
  );
}

function HandoffRow({
  h,
  runId,
  onChange,
}: {
  h: OfficeDepartmentHandoff;
  runId: string;
  onChange: () => void;
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"none" | "clarify" | "reject">("none");
  const [note, setNote] = useState("");
  const update = async (status: "accepted" | "needs_clarification" | "rejected" | "completed") => {
    await api.office.updateHandoff(h.id, {
      status,
      ...(status === "needs_clarification" ? { clarification: note } : {}),
      ...(status === "rejected" ? { rejectionReason: note } : {}),
    });
    onChange();
  };
  void runId;
  const statusBadge =
    h.status === "pending_acceptance"
      ? t("office.workMap.handoff.pending")
      : h.status === "needs_clarification"
        ? t("office.workMap.handoff.clarificationNeeded")
        : h.status === "accepted"
          ? t("office.workMap.handoff.accepted")
          : h.status === "rejected"
            ? t("office.workMap.handoff.rejected")
            : h.status === "completed"
              ? t("office.workMap.handoff.completed")
              : h.status;
  return (
    <div className="office-workmap-handoff" data-status={h.status}>
      <div className="office-workmap-handoff-head">
        <ArrowRight size={13} />
        <strong>
          {t("office.workMap.handoff.createdPrefix", {
            from: deptLabel(h.fromDepartmentSlug, t),
            to: deptLabel(h.toDepartmentSlug, t),
          })}
        </strong>
        <span className="office-workmap-handoff-status">{statusBadge}</span>
      </div>
      <p>{h.message}</p>
      {h.openQuestions.length > 0 && (
        <ul className="office-workmap-handoff-questions">
          {h.openQuestions.map((q, i) => (
            <li key={i}>
              <HelpCircle size={12} /> {q}
            </li>
          ))}
        </ul>
      )}
      {h.requestedClarification && (
        <p className="office-workmap-handoff-note">❓ {h.requestedClarification}</p>
      )}
      {h.rejectionReason && <p className="office-workmap-handoff-note">⛔ {h.rejectionReason}</p>}
      {(h.status === "pending_acceptance" || h.status === "needs_clarification") && mode === "none" && (
        <div className="office-workmap-handoff-actions">
          <button type="button" onClick={() => update("accepted")}>
            <CheckCircle2 size={13} /> {t("office.workMap.handoff.accept")}
          </button>
          <button type="button" onClick={() => setMode("clarify")}>
            {t("office.workMap.handoff.clarify")}
          </button>
          <button type="button" onClick={() => setMode("reject")}>
            <XCircle size={13} /> {t("office.workMap.handoff.reject")}
          </button>
        </div>
      )}
      {mode !== "none" && (
        <div className="office-workmap-handoff-form">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              (mode === "clarify"
                ? t("office.workMap.handoff.clarificationPh")
                : t("office.workMap.handoff.rejectionPh")) as string
            }
            rows={2}
          />
          <div className="office-workmap-handoff-actions">
            <button
              type="button"
              onClick={() => update(mode === "clarify" ? "needs_clarification" : "rejected")}
              disabled={!note.trim()}
            >
              {mode === "clarify" ? t("office.workMap.handoff.clarify") : t("office.workMap.handoff.reject")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("none");
                setNote("");
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {h.status === "accepted" && (
        <div className="office-workmap-handoff-actions">
          <button type="button" onClick={() => update("completed")}>
            {t("office.workMap.handoff.complete")}
          </button>
        </div>
      )}
    </div>
  );
}

export default function DepartmentWorkMapPanel({ runId }: { runId: string }) {
  const { t } = useTranslation();
  const [map, setMap] = useState<OfficeDepartmentWorkMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [composerFor, setComposerFor] = useState<string | null>(null);

  const refresh = async () => {
    const data = await api.office.workMap(runId);
    setMap(data);
  };

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch(() => setMap(null))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  if (loading) return <p className="office-workmap-empty">{t("office.loading")}</p>;
  if (!map || map.items.length === 0)
    return <p className="office-workmap-empty">{t("office.workMap.empty")}</p>;

  return (
    <div className="office-workmap">
      <div className="office-workmap-head">
        <h3>
          <ClipboardList size={15} /> {t("office.workMap.title")}
        </h3>
        <p>{t("office.workMap.subtitle")}</p>
      </div>
      <div className="office-workmap-grid">
        {map.items.map((item, index) => (
          <div className="office-workmap-card" data-status={item.status} key={item.id}>
            <div className="office-workmap-card-order">{index + 1}</div>
            <div className="office-workmap-card-title">
              <span role="img" aria-hidden>
                🏢
              </span>
              <strong>{deptLabel(item.departmentSlug, t)}</strong>
            </div>
            <p className="office-workmap-card-objective">{item.title}</p>
            <div className="office-workmap-card-status">
              {t(`office.workMap.status.${item.status}`, { defaultValue: item.businessStatus ?? item.status })}
            </div>
            {item.ownerAgentName && (
              <p className="office-workmap-meta">
                {t("office.workMap.owner")}: {item.ownerAgentName}
              </p>
            )}
            {item.nextAction && (
              <p className="office-workmap-meta">
                ▸ {t("office.workMap.nextAction")}: {item.nextAction}
              </p>
            )}
            {item.dependsOnId && (
              <p className="office-workmap-meta">
                ⏳ {t("office.workMap.dependsOn")}:{" "}
                {map.items.find((i) => i.id === item.dependsOnId)?.departmentSlug ?? "—"}
              </p>
            )}
            {item.blockedReason && (
              <p className="office-workmap-meta office-workmap-blocked">
                🚧 {t("office.workMap.blockedBy")}: {item.blockedReason}
              </p>
            )}
            {item.handoffsTo.map((h) => (
              <HandoffRow key={h.id} h={h} runId={runId} onChange={refresh} />
            ))}
            {item.handoffsFrom.map((h) => (
              <HandoffRow key={h.id} h={h} runId={runId} onChange={refresh} />
            ))}
            {composerFor === item.id ? (
              <NewHandoffForm
                runId={runId}
                items={map.items}
                sourceId={item.id}
                onDone={() => {
                  setComposerFor(null);
                  void refresh();
                }}
              />
            ) : (
              <button
                type="button"
                className="office-workmap-new-handoff"
                onClick={() => setComposerFor(item.id)}
              >
                <Send size={13} /> {t("office.workMap.handoff.new")}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
