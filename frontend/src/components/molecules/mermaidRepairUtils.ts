import { initMermaidTheme } from "./mermaidRenderUtils";

export interface MermaidRepairResult {
  repaired: string;
  valid: boolean;
  changed: boolean;
  fixes: string[];
}

export function repairMermaidSource(code: string): MermaidRepairResult {
  const repaired = code.trim();
  return {
    repaired,
    valid: repaired.length > 0,
    changed: repaired !== code,
    fixes: repaired !== code ? ["trim"] : [],
  };
}

export async function validateMermaid(code: string): Promise<{ valid: boolean; error?: string }> {
  if (!code.trim()) return { valid: false, error: "Diagrama vacío" };
  try {
    const mermaid = await initMermaidTheme();
    await mermaid.parse(code);
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function repairMermaidUntilValid(code: string): Promise<MermaidRepairResult> {
  const base = repairMermaidSource(code);
  const validation = await validateMermaid(base.repaired);
  return { ...base, valid: validation.valid };
}
