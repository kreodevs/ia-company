import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Send, Sparkles } from "lucide-react";
import { api, type CoordinatorChatMessage, type OfficeTaskPlan } from "../../lib/api";
import Button from "../ui/Button";
import TeamProposalCard from "./TeamProposalCard";

const WELCOME_KEY = "office.chat.welcome";

interface CoordinatorChatProps {
  productId?: string;
  serviceId?: string | null;
  initialUserMessage?: string | null;
  onPlanChange?: (plan: OfficeTaskPlan | null) => void;
  onExecuted?: (runId: string) => void;
}

export default function CoordinatorChat({
  productId,
  serviceId,
  initialUserMessage,
  onPlanChange,
  onExecuted,
}: CoordinatorChatProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
    setMessages([
      {
        role: "assistant",
        content: t(WELCOME_KEY),
      },
    ]);
  }, [t]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, plan]);

  const send = async (text: string, requestPlan = false) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const nextMessages: CoordinatorChatMessage[] = [
      ...messages.filter((m) => !(m.role === "assistant" && m.content === t(WELCOME_KEY))),
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
        serviceId: serviceId ?? undefined,
        requestPlan,
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
        productId: productId || plan.productId || undefined,
        serviceId: serviceId ?? plan.serviceId ?? undefined,
        workflowId: plan.workflowId ?? undefined,
        presetId: plan.presetId ?? undefined,
        agentIds: plan.agents.map((a) => a.id),
      });
      onExecuted?.(result.runId);
      navigate(`/runs/${result.runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("office.task.error"));
    } finally {
      setExecuting(false);
    }
  };

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

      {plan && (
        <TeamProposalCard plan={plan} onExecute={() => void executePlan()} executing={executing} compact />
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
              void send(input);
            }
          }}
        />
        <div className="office-chat-actions">
          <Button
            variant="secondary"
            onClick={() => void send(input, true)}
            disabled={busy || !input.trim()}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {t("office.chat.requestPlan")}
          </Button>
          <Button onClick={() => void send(input)} disabled={busy || !input.trim()}>
            <Send className="h-4 w-4" aria-hidden />
            {t("office.chat.send")}
          </Button>
        </div>
      </div>
    </div>
  );
}
