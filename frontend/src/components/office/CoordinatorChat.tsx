import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useChat, fetchServerSentEvents } from "@tanstack/ai-react";
import { Send, Sparkles } from "lucide-react";
import { api, type CoordinatorChatMessage, type OfficeTaskPlan } from "../../lib/api";
import {
  findClarifyingQuestions,
  findCompletedOfficePlan,
  findPendingProposalApproval,
  messageTextParts,
} from "../../lib/coordinator-chat-stream";
import { getOfficeChatMode, officeChatConfig } from "../../lib/office-chat-config";
import Button from "../ui/Button";
import TeamProposalCard from "./TeamProposalCard";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";
const WELCOME_KEY = "office.chat.welcome";

interface CoordinatorChatProps {
  productId?: string;
  orgUnitId?: string;
  serviceId?: string | null;
  workflowId?: string | null;
  parentRunId?: string;
  initialUserMessage?: string | null;
  welcomeMessageKey?: string;
  onPlanChange?: (plan: OfficeTaskPlan | null) => void;
  onExecuted?: (runId: string) => void;
}

function CoordinatorChatLegacy({
  productId,
  orgUnitId,
  serviceId,
  workflowId,
  parentRunId,
  initialUserMessage,
  welcomeMessageKey,
  onPlanChange,
  onExecuted,
}: CoordinatorChatProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const welcomeKey = welcomeMessageKey ?? WELCOME_KEY;
  const [messages, setMessages] = useState<CoordinatorChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [plan, setPlan] = useState<OfficeTaskPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    setMessages([{ role: "assistant", content: t(welcomeKey) }]);
  }, [t, welcomeKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, plan]);

  const send = async (text: string, requestPlan = false) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const nextMessages: CoordinatorChatMessage[] = [
      ...messages.filter((m) => !(m.role === "assistant" && m.content === t(welcomeKey))),
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setBusy(true);

    try {
      const response = await api.office.chat({
        messages: nextMessages,
        productId: productId || undefined,
        orgUnitId: orgUnitId || undefined,
        serviceId: serviceId ?? undefined,
        requestPlan,
        parentRunId,
      });
      setMessages([...nextMessages, { role: "assistant", content: response.reply }]);
      setPlan(response.plan);
      onPlanChange?.(response.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (initialUserMessage?.trim()) {
      void send(initialUserMessage, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const executePlan = async () => {
    if (!plan) return;
    setExecuting(true);
    setError(null);
    try {
      const result = await api.office.executeTask({
        request: plan.request,
        productId: productId || undefined,
        orgUnitId: orgUnitId || undefined,
        serviceId: serviceId ?? plan.serviceId ?? undefined,
        workflowId: workflowId ?? plan.workflowId ?? undefined,
        presetId: plan.presetId ?? undefined,
        agentIds: plan.agents.map((a) => a.id),
        parentRunId,
      });
      onExecuted?.(result.runId);
      const warProductId = productId || result.productId || undefined;
      const runQuery = `run=${encodeURIComponent(result.runId)}`;
      if (warProductId) {
        navigate(`/war-room/${warProductId}?${runQuery}`);
      } else {
        navigate(`/war-room?${runQuery}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("office.task.error"));
    } finally {
      setExecuting(false);
    }
  };

  return (
    <CoordinatorChatShell
      scrollRef={scrollRef}
      busy={busy}
      error={error}
      input={input}
      setInput={setInput}
      onSend={() => void send(input)}
      onRequestPlan={() => void send(input, true)}
      plan={plan}
      onExecutePlan={() => void executePlan()}
      executing={executing}
    >
      {messages.map((msg, i) => (
        <div key={`${msg.role}-${i}`} className={`office-chat-bubble office-chat-bubble-${msg.role}`}>
          {msg.role === "assistant" && (
            <span className="office-chat-bubble-avatar" aria-hidden>
              🎩
            </span>
          )}
          <p>{msg.content}</p>
        </div>
      ))}
    </CoordinatorChatShell>
  );
}

function CoordinatorChatStream({
  productId,
  orgUnitId,
  serviceId,
  workflowId,
  parentRunId,
  initialUserMessage,
  welcomeMessageKey,
  onPlanChange,
  onExecuted,
}: CoordinatorChatProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const welcomeKey = welcomeMessageKey ?? WELCOME_KEY;
  const [input, setInput] = useState("");
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);
  const requestPlanRef = useRef(false);
  const scopeRef = useRef({
    productId: productId || undefined,
    orgUnitId: orgUnitId || undefined,
    serviceId: serviceId ?? undefined,
    workflowId: workflowId ?? undefined,
    parentRunId: parentRunId || undefined,
  });

  scopeRef.current = {
    productId: productId || undefined,
    orgUnitId: orgUnitId || undefined,
    serviceId: serviceId ?? undefined,
    workflowId: workflowId ?? undefined,
    parentRunId: parentRunId || undefined,
  };

  const connection = useMemo(
    () =>
      fetchServerSentEvents(`${API_BASE}${officeChatConfig.streamPath}`, () => ({
        credentials: "include",
        body: {
          ...scopeRef.current,
          ...(requestPlanRef.current ? { requestPlan: true } : {}),
        },
      })),
    [],
  );

  const { messages, sendMessage, isLoading, error: streamError, addToolApprovalResponse } = useChat({
    connection,
    initialMessages: [
      {
        id: "welcome",
        role: "assistant",
        parts: [{ type: "text", content: t(welcomeKey) }],
      },
    ],
    onError: (err) => setError(err.message),
  });

  const pendingApproval = findPendingProposalApproval(messages);
  const clarifying = findClarifyingQuestions(messages);
  const plan = findCompletedOfficePlan(messages);

  useEffect(() => {
    onPlanChange?.(plan);
  }, [plan, onPlanChange]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, plan, pendingApproval, clarifying]);

  const send = async (text: string, requestPlan = false) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    setError(null);
    requestPlanRef.current = requestPlan;
    try {
      await sendMessage(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      requestPlanRef.current = false;
    }
  };

  useEffect(() => {
    if (seeded.current || !initialUserMessage?.trim()) return;
    seeded.current = true;
    void send(initialUserMessage, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const executePlan = async () => {
    if (!plan) return;
    setExecuting(true);
    setError(null);
    try {
      const result = await api.office.executeTask({
        request: plan.request,
        productId: productId || undefined,
        orgUnitId: orgUnitId || undefined,
        serviceId: serviceId ?? plan.serviceId ?? undefined,
        workflowId: workflowId ?? plan.workflowId ?? undefined,
        presetId: plan.presetId ?? undefined,
        agentIds: plan.agents.map((a) => a.id),
        parentRunId,
      });
      onExecuted?.(result.runId);
      const warProductId = productId || result.productId || undefined;
      const runQuery = `run=${encodeURIComponent(result.runId)}`;
      if (warProductId) {
        navigate(`/war-room/${warProductId}?${runQuery}`);
      } else {
        navigate(`/war-room?${runQuery}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("office.task.error"));
    } finally {
      setExecuting(false);
    }
  };

  const displayError = error ?? streamError?.message ?? null;

  return (
    <CoordinatorChatShell
      scrollRef={scrollRef}
      busy={isLoading}
      error={displayError}
      input={input}
      setInput={setInput}
      onSend={() => void send(input)}
      onRequestPlan={() => void send(input, true)}
      plan={plan}
      onExecutePlan={() => void executePlan()}
      executing={executing}
    >
      {messages.map((msg) => {
        const text = messageTextParts(msg);
        if (!text.trim() && msg.role === "assistant") return null;
        return (
          <div key={msg.id} className={`office-chat-bubble office-chat-bubble-${msg.role}`}>
            {msg.role === "assistant" && (
              <span className="office-chat-bubble-avatar" aria-hidden>
                🎩
              </span>
            )}
            {text.trim() ? <p>{text}</p> : null}
          </div>
        );
      })}

      {clarifying && (
        <div className="office-chat-clarify">
          <p className="office-chat-clarify-title">{t("office.chat.clarifyingTitle")}</p>
          {clarifying.contextSummary ? (
            <p className="office-chat-clarify-summary">{clarifying.contextSummary}</p>
          ) : null}
          <ol className="office-chat-clarify-list">
            {clarifying.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </div>
      )}

      {pendingApproval && (
        <div className="office-chat-approval">
          <p className="office-chat-approval-title">{t("office.chat.approveProposalTitle")}</p>
          {pendingApproval.rationale ? (
            <p className="office-chat-approval-rationale">{pendingApproval.rationale}</p>
          ) : null}
          {pendingApproval.taskBrief ? (
            <pre className="office-chat-approval-brief">{pendingApproval.taskBrief}</pre>
          ) : null}
          <div className="office-chat-approval-actions">
            <Button
              variant="secondary"
              disabled={isLoading}
              onClick={() =>
                void addToolApprovalResponse({ id: pendingApproval.approvalId, approved: false })
              }
            >
              {t("office.chat.rejectProposal")}
            </Button>
            <Button
              disabled={isLoading}
              onClick={() =>
                void addToolApprovalResponse({ id: pendingApproval.approvalId, approved: true })
              }
            >
              {t("office.chat.approveProposal")}
            </Button>
          </div>
        </div>
      )}
    </CoordinatorChatShell>
  );
}

interface CoordinatorChatShellProps {
  scrollRef: RefObject<HTMLDivElement | null>;
  busy: boolean;
  error: string | null;
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onRequestPlan: () => void;
  plan: OfficeTaskPlan | null;
  onExecutePlan: () => void;
  executing: boolean;
  children: ReactNode;
}

function CoordinatorChatShell({
  scrollRef,
  busy,
  error,
  input,
  setInput,
  onSend,
  onRequestPlan,
  plan,
  onExecutePlan,
  executing,
  children,
}: CoordinatorChatShellProps) {
  const { t } = useTranslation();

  return (
    <div className="office-chat">
      <div className="office-chat-header">
        <span className="office-chat-avatar" aria-hidden>
          🎩
        </span>
        <div>
          <p className="office-chat-name">{t("office.chat.coordinatorName")}</p>
          <p className="office-chat-status">{busy ? t("office.chat.thinking") : t("office.chat.online")}</p>
        </div>
      </div>

      <div className="office-chat-messages" ref={scrollRef}>
        {children}
        {busy && (
          <div className="office-chat-bubble office-chat-bubble-assistant office-chat-typing">
            <span className="office-chat-bubble-avatar" aria-hidden>
              🎩
            </span>
            <span className="war-room-typing" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </div>
        )}
      </div>

      {plan && !executing && (
        <TeamProposalCard plan={plan} onExecute={onExecutePlan} executing={executing} compact />
      )}

      {error && <p className="office-chat-error">{error}</p>}

      <div className="office-chat-composer">
        <textarea
          className="office-chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("office.chat.placeholder")}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <div className="office-chat-actions">
          <Button variant="secondary" onClick={onRequestPlan} disabled={busy || !input.trim()}>
            <Sparkles className="h-4 w-4" aria-hidden />
            {t("office.chat.requestPlan")}
          </Button>
          <Button onClick={onSend} disabled={busy || !input.trim()}>
            <Send className="h-4 w-4" aria-hidden />
            {t("office.chat.send")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CoordinatorChat(props: CoordinatorChatProps) {
  const mode = getOfficeChatMode();
  if (mode === "legacy") {
    return <CoordinatorChatLegacy {...props} />;
  }
  return <CoordinatorChatStream {...props} />;
}
