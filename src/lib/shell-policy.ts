/**
 * Unified shell safety policy — all command execution paths must use this module.
 * Mirrors non-negotiable guardrails from CLAUDE.md.
 */

const BLOCKED_COMMAND_PATTERNS: RegExp[] = [
  /rm\s+-rf\s+\/(?:\s|$)/i,
  /rm\s+-rf\s+~/i,
  /\bmkfs\b/i,
  /:\(\)\s*\{\s*:\|:&\s*\};:/,
  /\bdd\s+if=/i,
  />\s*\/dev\/sd/i,
  /\bgh\s+repo\s+delete\b/i,
  /\bwrangler\s+delete\b/i,
  /\bgit\s+push\b[^\n]*(?:--force|\s-f\b)/i,
  /\bgit\s+push\s+-f\b/i,
  /\bgit\s+reset\s+--hard\b[^\n]*(?:main|master)\b/i,
];

const SENSITIVE_PATH_PATTERNS: RegExp[] = [
  /(?:^|[\s'"`])\.env(?:\b|$)/i,
  /(?:^|[\s'"`])\.git\/config\b/i,
  /~\/\.ssh\b/i,
  /~\/\.config\b/i,
  /~\/\.claude\b/i,
];

export class ShellPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShellPolicyError";
  }
}

export function assertShellCommandAllowed(command: string): void {
  const trimmed = command.trim();
  if (!trimmed) {
    throw new ShellPolicyError("Empty command");
  }

  for (const pattern of BLOCKED_COMMAND_PATTERNS) {
    if (pattern.test(trimmed)) {
      throw new ShellPolicyError("Command blocked by safety policy");
    }
  }

  for (const pattern of SENSITIVE_PATH_PATTERNS) {
    if (pattern.test(trimmed)) {
      throw new ShellPolicyError("Command blocked: sensitive path access");
    }
  }
}

export function isShellCommandAllowed(command: string): boolean {
  try {
    assertShellCommandAllowed(command);
    return true;
  } catch {
    return false;
  }
}
