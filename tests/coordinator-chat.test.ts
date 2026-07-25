import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTaskBriefFromConversation,
  extractTaskRequest,
} from "../src/lib/coordinator-chat.js";

describe("coordinator chat task brief", () => {
  it("extractTaskRequest returns only the last user message", () => {
    const brief = extractTaskRequest([
      { role: "user", content: "Quiero diseño funcional de Alebrije" },
      { role: "assistant", content: "¿Alcance general o por producto?" },
      { role: "user", content: "A nivel general y necesito el diseño de la aplicación (funcionalidades)" },
    ]);
    assert.equal(brief, "A nivel general y necesito el diseño de la aplicación (funcionalidades)");
  });

  it("buildTaskBriefFromConversation includes prior user messages and coordinator reply", () => {
    const brief = buildTaskBriefFromConversation([
      { role: "user", content: "Quiero diseño funcional de Alebrije MemorIA" },
      { role: "assistant", content: "Propongo equipo product-norman + interaction-cooper. ¿Apruebas?" },
      { role: "user", content: "A nivel general y necesito el diseño de la aplicación (funcionalidades)" },
    ]);
    assert.match(brief, /Contexto del fundador/);
    assert.match(brief, /diseño funcional de Alebrije MemorIA/);
    assert.match(brief, /Acuerdo del coordinador/);
    assert.match(brief, /product-norman \+ interaction-cooper/);
    assert.match(brief, /Encargo acordado/);
  });
});
