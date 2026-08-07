/** Agents allowed to run git write operations (commit/add/push) and git_* tools. */
export const GIT_TOOL_AGENT_NAMES = new Set(["fullstack-dhh", "devops-hightower"]);

export function agentHasGitTools(agentName?: string | null): boolean {
  return typeof agentName === "string" && GIT_TOOL_AGENT_NAMES.has(agentName);
}

const GIT_WRITE_COMMAND = /\bgit\s+(commit|add|push)\b/i;

export function isGitWriteShellCommand(command: string): boolean {
  return GIT_WRITE_COMMAND.test(command.trim());
}

export function shellGitWriteBlockedMessage(agentName?: string | null): string {
  return agentName
    ? `git write operations are not available for ${agentName}. Save deliverables with write_file under docs/{role}/.`
    : "git write operations are not available for this agent role. Save deliverables with write_file.";
}
