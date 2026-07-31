import type { OfficeTaskPlan } from "./api";

/** Minimal shape for parsing TanStack AI UIMessage parts. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChatMessagesInput = Array<{ role: string; parts: any[] }>;

type StreamMessage = ChatMessagesInput[number];

export function messageTextParts(message: StreamMessage): string {
  return message.parts
    .filter((part) => part.type === "text" && typeof part.content === "string")
    .map((part) => part.content as string)
    .join("");
}

export interface PendingProposalApproval {
  approvalId: string;
  taskBrief: string;
  rationale: string;
}

export function findPendingProposalApproval(messages: ChatMessagesInput): PendingProposalApproval | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.role !== "assistant") continue;
    for (const part of message.parts) {
      if (
        part.type !== "tool-call" ||
        part.name !== "propose_office_task" ||
        part.state !== "approval-requested"
      ) {
        continue;
      }
      const input = (part.input ?? {}) as { taskBrief?: string; rationale?: string };
      const approval = part.approval as { id?: string } | undefined;
      if (!approval?.id) continue;
      return {
        approvalId: approval.id,
        taskBrief: input.taskBrief ?? "",
        rationale: input.rationale ?? "",
      };
    }
  }
  return null;
}

export function findCompletedOfficePlan(messages: ChatMessagesInput): OfficeTaskPlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.role !== "assistant") continue;
    for (const part of message.parts) {
      if (
        part.type !== "tool-call" ||
        part.name !== "propose_office_task" ||
        part.state !== "complete" ||
        !part.output
      ) {
        continue;
      }
      const output = part.output as OfficeTaskPlan;
      if (output?.planId && output.request) return output;
    }
  }
  return null;
}

export interface ClarifyingQuestionsBlock {
  questions: string[];
  contextSummary: string;
}

export function findClarifyingQuestions(messages: ChatMessagesInput): ClarifyingQuestionsBlock | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.role !== "assistant") continue;
    for (const part of message.parts) {
      if (
        part.type !== "tool-call" ||
        part.name !== "ask_clarifying_questions" ||
        part.state !== "complete" ||
        !part.output
      ) {
        continue;
      }
      const output = part.output as ClarifyingQuestionsBlock;
      if (Array.isArray(output.questions) && output.questions.length > 0) {
        return output;
      }
    }
  }
  return null;
}
