import { execFile } from "node:child_process";
import { access, readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, normalize, resolve } from "node:path";
import { promisify } from "node:util";
import { tool } from "ai";
import { z } from "zod";
import type { ToolExecutionContext } from "../types/index.js";
import { assertShellCommandAllowed } from "../lib/shell-policy.js";

const execFileAsync = promisify(execFile);

const BLOCKED_PATHS = [".git/config", ".env", "node_modules/.cache"];

function resolveSafePath(workspaceRoot: string, relativePath: string): string {
  const root = resolve(workspaceRoot);
  const target = resolve(root, normalize(relativePath));
  if (!target.startsWith(root)) {
    throw new Error(`Path escapes workspace: ${relativePath}`);
  }
  for (const blocked of BLOCKED_PATHS) {
    if (target.includes(blocked)) {
      throw new Error(`Access denied: ${relativePath}`);
    }
  }
  return target;
}

export function createAgentTools(ctx: ToolExecutionContext) {
  const log = (message: string, payload?: Record<string, unknown>) => {
    ctx.onLog?.(message, payload);
  };

  const run_shell_command = tool({
    description:
      "Execute a shell command in the workspace. Timeout enforced. Destructive system commands are blocked.",
    parameters: z.object({
      command: z.string().describe("Shell command to execute"),
      cwd: z
        .string()
        .optional()
        .describe("Working directory relative to workspace root"),
    }),
    execute: async ({ command, cwd }) => {
      assertShellCommandAllowed(command);

      const workDir = cwd
        ? resolveSafePath(ctx.workspaceRoot, cwd)
        : resolve(ctx.workspaceRoot);

      log(`shell: ${command}`, { cwd: workDir });

      try {
        const { stdout, stderr } = await execFileAsync("sh", ["-c", command], {
          cwd: workDir,
          timeout: ctx.shellTimeoutMs,
          maxBuffer: 1024 * 512,
          env: { ...process.env, CI: "true" },
        });

        return {
          stdout: stdout.slice(0, 50_000),
          stderr: stderr.slice(0, 10_000),
          exitCode: 0,
        };
      } catch (err: unknown) {
        const error = err as { stdout?: string; stderr?: string; code?: number; killed?: boolean };
        if (error.killed) {
          throw new Error(`Command timed out after ${ctx.shellTimeoutMs}ms`);
        }
        return {
          stdout: (error.stdout ?? "").slice(0, 50_000),
          stderr: (error.stderr ?? String(err)).slice(0, 10_000),
          exitCode: error.code ?? 1,
        };
      }
    },
  });

  const read_file = tool({
    description: "Read a text file from the workspace",
    parameters: z.object({
      path: z.string().describe("File path relative to workspace root"),
      maxBytes: z.number().optional().default(100_000),
    }),
    execute: async ({ path, maxBytes }) => {
      const fullPath = resolveSafePath(ctx.workspaceRoot, path);
      log(`read: ${path}`);
      try {
        const content = await readFile(fullPath, "utf-8");
        return { path, content: content.slice(0, maxBytes) };
      } catch (err: unknown) {
        const error = err as NodeJS.ErrnoException;
        if (error.code === "ENOENT") {
          return {
            path,
            missing: true,
            error: `File not found: ${path}. See README.md and portfolio.md in the workspace root.`,
          };
        }
        throw err;
      }
    },
  });

  const write_file = tool({
    description: "Write or overwrite a text file in the workspace",
    parameters: z.object({
      path: z.string().describe("File path relative to workspace root"),
      content: z.string().describe("File content to write"),
    }),
    execute: async ({ path, content }) => {
      const fullPath = resolveSafePath(ctx.workspaceRoot, path);
      await mkdir(dirname(fullPath), { recursive: true });
      log(`write: ${path}`, { bytes: content.length });
      await writeFile(fullPath, content, "utf-8");
      return { path, bytesWritten: Buffer.byteLength(content, "utf-8") };
    },
  });

  const list_dir = tool({
    description: "List files and directories in a workspace path",
    parameters: z.object({
      path: z.string().default(".").describe("Directory relative to workspace root"),
      recursive: z.boolean().optional().default(false),
    }),
    execute: async ({ path, recursive }) => {
      const fullPath = resolveSafePath(ctx.workspaceRoot, path);
      log(`list: ${path}`);

      try {
        await access(fullPath);
      } catch (err: unknown) {
        const error = err as NodeJS.ErrnoException;
        if (error.code === "ENOENT") {
          return {
            path,
            entries: [],
            missing: true,
            hint:
              path === "projects" || path.startsWith("projects/")
                ? "There is no projects/ folder inside the tenant workspace. Product repos are sibling folders (../{slug}/) or the workspace root is already a product repo."
                : `Directory not found: ${path}. List '.' or read README.md / portfolio.md.`,
          };
        }
        throw err;
      }

      if (!recursive) {
        const entries = await readdir(fullPath, { withFileTypes: true });
        return {
          path,
          entries: entries.map((e) => ({
            name: e.name,
            type: e.isDirectory() ? "directory" : "file",
          })),
        };
      }

      const results: Array<{ path: string; type: string }> = [];

      async function walk(dir: string, prefix: string) {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name === "node_modules" || entry.name === ".git") continue;
          const rel = join(prefix, entry.name);
          results.push({
            path: rel,
            type: entry.isDirectory() ? "directory" : "file",
          });
          if (entry.isDirectory() && results.length < 500) {
            await walk(join(dir, entry.name), rel);
          }
        }
      }

      await walk(fullPath, path === "." ? "" : path);
      return { path, entries: results.slice(0, 500) };
    },
  });

  const git_status = tool({
    description: "Show git status in the workspace (short format)",
    parameters: z.object({}),
    execute: async () => {
      const { stdout, stderr, exitCode } = await runShell(ctx, "git status --short --branch", ctx.workspaceRoot);
      return { stdout, stderr, exitCode };
    },
  });

  const git_commit = tool({
    description: "Stage all changes and create a git commit in the workspace",
    parameters: z.object({
      message: z.string().describe("Commit message"),
    }),
    execute: async ({ message }) => {
      if (!message.trim()) throw new Error("Commit message required");
      await runShell(ctx, "git add -A", ctx.workspaceRoot);
      const result = await runShell(
        ctx,
        `git commit -m ${JSON.stringify(message.trim())}`,
        ctx.workspaceRoot,
      );
      return result;
    },
  });

  const npm_run = tool({
    description: "Run an npm script in the workspace (install, build, test, deploy only)",
    parameters: z.object({
      script: z.enum(["install", "build", "test", "run"]),
      args: z.string().optional().describe("Extra args for npm run, e.g. deploy"),
    }),
    execute: async ({ script, args }) => {
      const allowed = ["install", "build", "test", "run"];
      if (!allowed.includes(script)) throw new Error("Script not allowed");
      const cmd =
        script === "install"
          ? "npm install"
          : script === "run" && args
            ? `npm run ${args}`
            : `npm ${script}`;
      return runShell(ctx, cmd, ctx.workspaceRoot);
    },
  });

  const wrangler_deploy = tool({
    description: "Deploy a Cloudflare Worker project with wrangler from workspace root",
    parameters: z.object({
      cwd: z.string().default(".").describe("Project directory relative to workspace"),
    }),
    execute: async ({ cwd }) => {
      const workDir = resolveSafePath(ctx.workspaceRoot, cwd);
      return runShell(ctx, "npx wrangler deploy", workDir);
    },
  });

  const delegate_implementation = tool({
    description:
      "Delegate code implementation to the tenant's OpenCode server. Provide a complete implementation brief with acceptance criteria.",
    parameters: z.object({
      brief: z.string().describe("Markdown implementation brief for OpenCode"),
    }),
    execute: async ({ brief }) => {
      if (!ctx.tenantId) {
        throw new Error("Tenant context required to delegate to OpenCode");
      }
      if (!brief.trim()) {
        throw new Error("Implementation brief is required");
      }

      const { startOpencodeDelegation } = await import("../lib/opencode-bridge.js");
      const delegationId = await startOpencodeDelegation({
        tenantId: ctx.tenantId,
        runId: ctx.runId,
        brief,
        sharedMemory: ctx.sharedMemory ?? {},
        productSlug: ctx.productSlug,
        productId: ctx.productId,
        resumeFromStepOrder: ctx.resumeFromStepOrder ?? 3,
      });

      ctx.onDelegationStarted?.();
      log("opencode: delegation started", { delegationId });

      return {
        delegated: true,
        delegationId,
        message: "Implementation delegated to OpenCode. The run will resume after OpenCode finishes.",
      };
    },
  });

  const send_email = tool({
    description:
      "Send an email to allowed tenant recipients via configured SMTP. Use when the human asked to receive deliverables by email.",
    parameters: z.object({
      to: z.array(z.string().email()).min(1).max(5).describe("Recipient emails (must be on tenant allowlist)"),
      subject: z.string().min(1).max(200),
      body: z.string().min(1).max(100_000).describe("Plain text or markdown body"),
    }),
    execute: async ({ to, subject, body }) => {
      if (!ctx.tenantId) throw new Error("Tenant context required to send email");
      const { sendTenantAgentEmail } = await import("../lib/tenant-smtp.js");
      const result = await sendTenantAgentEmail({
        tenantId: ctx.tenantId,
        runId: ctx.runId,
        agentId: ctx.agentId,
        to,
        subject,
        body,
      });
      log("email: sent", { to: result.recipients, subject });
      return result;
    },
  });

  const mode = ctx.toolMode ?? "full";
  const allTools = {
    run_shell_command,
    read_file,
    write_file,
    list_dir,
    git_status,
    git_commit,
    npm_run,
    wrangler_deploy,
    delegate_implementation,
    send_email,
  };

  if (mode === "readonly") {
    return {
      read_file: allTools.read_file,
      list_dir: allTools.list_dir,
      git_status: allTools.git_status,
    };
  }

  if (mode === "opencode_delegate") {
    return {
      read_file: allTools.read_file,
      list_dir: allTools.list_dir,
      delegate_implementation: allTools.delegate_implementation,
    };
  }

  const base = {
    run_shell_command: allTools.run_shell_command,
    read_file: allTools.read_file,
    write_file: allTools.write_file,
    list_dir: allTools.list_dir,
    git_status: allTools.git_status,
    git_commit: allTools.git_commit,
    npm_run: allTools.npm_run,
    wrangler_deploy: allTools.wrangler_deploy,
    send_email: allTools.send_email,
  };

  return base;
}

export async function createAgentToolsWithIntegrations(
  ctx: ToolExecutionContext & { agentId?: string },
) {
  const base = createAgentTools(ctx);
  if (ctx.toolMode === "readonly" || ctx.toolMode === "opencode_delegate") {
    return base;
  }

  const { buildMcpToolsForAgent } = await import("../lib/mcp-tools-bridge.js");
  const mcpTools = await buildMcpToolsForAgent(ctx);
  return { ...base, ...mcpTools };
}

async function runShell(
  ctx: ToolExecutionContext,
  command: string,
  cwd: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  assertShellCommandAllowed(command);

  ctx.onLog?.(`shell: ${command}`, { cwd });

  const env = { ...process.env, CI: "true" } as Record<string, string>;
  if (ctx.githubToken) env.GH_TOKEN = ctx.githubToken;

  try {
    const { stdout, stderr } = await execFileAsync("sh", ["-c", command], {
      cwd,
      timeout: ctx.shellTimeoutMs,
      maxBuffer: 1024 * 512,
      env,
    });
    return { stdout: stdout.slice(0, 50_000), stderr: stderr.slice(0, 10_000), exitCode: 0 };
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string; code?: number; killed?: boolean };
    if (error.killed) {
      throw new Error(`Command timed out after ${ctx.shellTimeoutMs}ms`);
    }
    return {
      stdout: (error.stdout ?? "").slice(0, 50_000),
      stderr: (error.stderr ?? String(err)).slice(0, 10_000),
      exitCode: error.code ?? 1,
    };
  }
}

export type AgentTools = ReturnType<typeof createAgentTools>;
