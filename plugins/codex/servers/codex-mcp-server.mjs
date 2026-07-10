#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

export const SERVER_NAME = "codex-cli";
export const SERVER_VERSION = "0.2.0";
export const PROTOCOL_VERSION = "2025-06-18";

const VALID_EFFORTS = new Set(["low", "medium", "high", "xhigh"]);
const VALID_REVIEW_TARGETS = new Set(["uncommitted", "base", "commit"]);
const MAX_CAPTURE_BYTES = 512 * 1024;

const commonProperties = {
  prompt: {
    type: "string",
    minLength: 1,
    description: "Self-contained task instructions to send to Codex."
  },
  model: {
    type: "string",
    minLength: 1,
    maxLength: 128,
    description: "Optional Codex model override. Defaults to CODEX_TEAM_MODEL or gpt-5.5."
  },
  effort: {
    type: "string",
    enum: ["low", "medium", "high", "xhigh"],
    description: "Optional reasoning effort. Defaults to CODEX_TEAM_EFFORT or low."
  },
  timeout_seconds: {
    type: "integer",
    minimum: 10,
    maximum: 3600,
    description: "Optional execution timeout in seconds."
  }
};

export const TOOL_DEFINITIONS = [
  {
    name: "codex_investigate",
    title: "Investigate with Codex",
    description: "Run a read-only, ephemeral Codex task for investigation, planning, research, or analysis. The repository cannot be modified by Codex.",
    inputSchema: {
      type: "object",
      properties: commonProperties,
      required: ["prompt"],
      additionalProperties: false
    },
    annotations: {
      title: "Read-only Codex investigation",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  {
    name: "codex_implement",
    title: "Implement with Codex",
    description: "Run an ephemeral Codex task with workspace-write access. Use only after the user explicitly requests implementation or file changes.",
    inputSchema: {
      type: "object",
      properties: commonProperties,
      required: ["prompt"],
      additionalProperties: false
    },
    annotations: {
      title: "Write-capable Codex implementation",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true
    }
  },
  {
    name: "codex_review",
    title: "Review with Codex",
    description: "Run Codex's native read-only review against uncommitted changes, a base branch, or a commit.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          maxLength: 200000,
          description: "Optional focus or custom review instructions."
        },
        model: commonProperties.model,
        effort: commonProperties.effort,
        timeout_seconds: commonProperties.timeout_seconds,
        target: {
          type: "string",
          enum: ["uncommitted", "base", "commit"],
          default: "uncommitted",
          description: "The changes to review."
        },
        reference: {
          type: "string",
          minLength: 1,
          maxLength: 512,
          description: "Base branch/ref or commit SHA. Required for base and commit targets."
        }
      },
      additionalProperties: false
    },
    annotations: {
      title: "Read-only Codex review",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  }
];

function debug(message) {
  if (process.env.CODEX_MCP_DEBUG === "1") {
    process.stderr.write(`[${SERVER_NAME}] ${message}\n`);
  }
}

function asNonEmptyString(value, label, { required = false, maxLength = 200000 } = {}) {
  if (value === undefined || value === null) {
    if (required) {
      throw new Error(`${label} is required`);
    }
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }
  const normalized = value.trim();
  if (!normalized) {
    if (required) {
      throw new Error(`${label} must not be empty`);
    }
    return null;
  }
  if (normalized.length > maxLength) {
    throw new Error(`${label} exceeds ${maxLength} characters`);
  }
  return value;
}

function defaultEffort() {
  const value = process.env.CODEX_TEAM_EFFORT || "low";
  return VALID_EFFORTS.has(value) ? value : "low";
}

function defaultTimeoutSeconds() {
  const parsed = Number.parseInt(process.env.CODEX_MCP_TIMEOUT_SECONDS || "1800", 10);
  return Number.isInteger(parsed) && parsed >= 10 && parsed <= 3600 ? parsed : 1800;
}

export function normalizeToolArguments(toolName, rawArguments = {}) {
  if (!rawArguments || typeof rawArguments !== "object" || Array.isArray(rawArguments)) {
    throw new Error("tool arguments must be an object");
  }

  const model = asNonEmptyString(rawArguments.model, "model", { maxLength: 128 })
    || process.env.CODEX_TEAM_MODEL
    || "gpt-5.5";
  const effort = rawArguments.effort || defaultEffort();
  if (!VALID_EFFORTS.has(effort)) {
    throw new Error(`effort must be one of: ${[...VALID_EFFORTS].join(", ")}`);
  }

  const timeoutSeconds = rawArguments.timeout_seconds ?? defaultTimeoutSeconds();
  if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 10 || timeoutSeconds > 3600) {
    throw new Error("timeout_seconds must be an integer from 10 to 3600");
  }

  if (toolName === "codex_investigate" || toolName === "codex_implement") {
    return {
      prompt: asNonEmptyString(rawArguments.prompt, "prompt", { required: true }),
      model,
      effort,
      timeoutSeconds,
      sandbox: toolName === "codex_investigate" ? "read-only" : "workspace-write"
    };
  }

  if (toolName === "codex_review") {
    const target = rawArguments.target || "uncommitted";
    if (!VALID_REVIEW_TARGETS.has(target)) {
      throw new Error("target must be uncommitted, base, or commit");
    }
    const reference = asNonEmptyString(rawArguments.reference, "reference", { maxLength: 512 });
    if ((target === "base" || target === "commit") && !reference) {
      throw new Error(`reference is required when target is ${target}`);
    }
    if (target === "uncommitted" && reference) {
      throw new Error("reference is not allowed when target is uncommitted");
    }
    return {
      prompt: asNonEmptyString(rawArguments.prompt, "prompt"),
      model,
      effort,
      timeoutSeconds,
      target,
      reference
    };
  }

  throw new Error(`Unknown tool: ${toolName}`);
}

function resolveProjectDirectory() {
  const configured = process.env.CLAUDE_PROJECT_DIR;
  const candidate = configured ? path.resolve(configured) : process.cwd();
  try {
    if (fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  } catch {
    // Fall back to the MCP process directory below.
  }
  return process.cwd();
}

export function buildCodexInvocation(toolName, options, projectDirectory = resolveProjectDirectory()) {
  if (toolName === "codex_review") {
    const args = [
      "review",
      "--config", `model=${JSON.stringify(options.model)}`,
      "--config", `model_reasoning_effort=${JSON.stringify(options.effort)}`
    ];
    if (options.target === "base") {
      args.push("--base", options.reference);
    } else if (options.target === "commit") {
      args.push("--commit", options.reference);
    } else {
      args.push("--uncommitted");
    }
    if (options.prompt) {
      args.push("-");
    }
    return { args, cwd: projectDirectory, stdin: options.prompt || "" };
  }

  return {
    args: [
      "exec",
      "--ephemeral",
      "--sandbox", options.sandbox,
      "--cd", projectDirectory,
      "--model", options.model,
      "--config", `model_reasoning_effort=${JSON.stringify(options.effort)}`,
      "-"
    ],
    cwd: projectDirectory,
    stdin: options.prompt
  };
}

function createCapture(limit = MAX_CAPTURE_BYTES) {
  const chunks = [];
  let captured = 0;
  let omitted = 0;
  return {
    push(chunk) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      const remaining = limit - captured;
      if (remaining > 0) {
        const accepted = buffer.subarray(0, remaining);
        chunks.push(accepted);
        captured += accepted.length;
      }
      omitted += Math.max(0, buffer.length - Math.max(0, remaining));
    },
    text() {
      const value = Buffer.concat(chunks).toString("utf8");
      return omitted > 0 ? `${value}\n[output truncated: ${omitted} bytes omitted]` : value;
    }
  };
}

function formatFailure(exitCode, signal, stdout, stderr) {
  const header = signal
    ? `Codex terminated by signal ${signal}.`
    : `Codex exited with code ${exitCode ?? 1}.`;
  const sections = [header];
  if (stderr.trim()) {
    sections.push(`stderr:\n${stderr.trim()}`);
  }
  if (stdout.trim()) {
    sections.push(`stdout:\n${stdout.trim()}`);
  }
  return sections.join("\n\n");
}

const activeChildren = new Map();

export function runCodex(toolName, options, requestId) {
  const invocation = buildCodexInvocation(toolName, options);
  const command = process.env.CODEX_CLI_PATH || "codex";
  const stdout = createCapture();
  const stderr = createCapture();

  return new Promise((resolve) => {
    let settled = false;
    let child;

    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      activeChildren.delete(String(requestId));
      resolve(result);
    };

    try {
      child = spawn(command, invocation.args, {
        cwd: invocation.cwd,
        env: {
          ...process.env,
          NO_COLOR: "1",
          TERM: "dumb"
        },
        shell: false,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"]
      });
    } catch (error) {
      resolve({ ok: false, text: error instanceof Error ? error.message : String(error) });
      return;
    }

    activeChildren.set(String(requestId), child);
    const timer = setTimeout(() => {
      child.kill();
      finish({
        ok: false,
        text: `Codex timed out after ${options.timeoutSeconds} seconds.`
      });
    }, options.timeoutSeconds * 1000);

    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.once("error", (error) => {
      finish({ ok: false, text: error instanceof Error ? error.message : String(error) });
    });
    child.once("close", (exitCode, signal) => {
      const stdoutText = stdout.text();
      const stderrText = stderr.text();
      if (exitCode === 0) {
        finish({ ok: true, text: stdoutText.trim() || stderrText.trim() || "Codex completed without output." });
      } else {
        finish({ ok: false, text: formatFailure(exitCode, signal, stdoutText, stderrText) });
      }
    });

    child.stdin.on("error", (error) => debug(`stdin error: ${error.message}`));
    child.stdin.end(invocation.stdin);
  });
}

function toolResult(text, isError = false) {
  return {
    content: [{ type: "text", text }],
    ...(isError ? { isError: true } : {})
  };
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function sendResult(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function sendError(id, code, message, data) {
  send({
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data })
    }
  });
}

async function handleRequest(message) {
  const { id, method, params } = message;
  if (method === "initialize") {
    sendResult(id, {
      protocolVersion: params?.protocolVersion || PROTOCOL_VERSION,
      capabilities: {
        tools: { listChanged: false }
      },
      serverInfo: {
        name: SERVER_NAME,
        version: SERVER_VERSION
      },
      instructions: "Use codex_investigate for read-only work, codex_implement only for explicit write requests, and codex_review for native code reviews."
    });
    return;
  }
  if (method === "ping") {
    sendResult(id, {});
    return;
  }
  if (method === "tools/list") {
    sendResult(id, { tools: TOOL_DEFINITIONS });
    return;
  }
  if (method === "tools/call") {
    const toolName = params?.name;
    try {
      const options = normalizeToolArguments(toolName, params?.arguments || {});
      const result = await runCodex(toolName, options, id);
      sendResult(id, toolResult(result.text, !result.ok));
    } catch (error) {
      sendResult(id, toolResult(error instanceof Error ? error.message : String(error), true));
    }
    return;
  }
  sendError(id, -32601, `Method not found: ${method}`);
}

function handleNotification(message) {
  if (message.method === "notifications/cancelled") {
    const requestId = message.params?.requestId;
    const child = activeChildren.get(String(requestId));
    if (child) {
      child.kill();
      activeChildren.delete(String(requestId));
    }
  }
}

export function startServer() {
  const input = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
    terminal: false
  });

  input.on("line", (line) => {
    if (!line.trim()) {
      return;
    }
    let message;
    try {
      message = JSON.parse(line);
    } catch (error) {
      sendError(null, -32700, "Parse error", error instanceof Error ? error.message : String(error));
      return;
    }
    if (!message || message.jsonrpc !== "2.0" || Array.isArray(message)) {
      sendError(message?.id ?? null, -32600, "Invalid Request");
      return;
    }
    if (message.id === undefined) {
      handleNotification(message);
      return;
    }
    void handleRequest(message).catch((error) => {
      sendError(message.id, -32603, "Internal error", error instanceof Error ? error.message : String(error));
    });
  });

  input.once("close", () => {
    for (const child of activeChildren.values()) {
      child.kill();
    }
    activeChildren.clear();
  });
}

const entryPoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entryPoint === import.meta.url) {
  startServer();
}
