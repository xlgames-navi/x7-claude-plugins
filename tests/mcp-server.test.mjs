import assert from "node:assert/strict";
import path from "node:path";
import readline from "node:readline";
import test from "node:test";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  TOOL_DEFINITIONS,
  buildCodexInvocation,
  normalizeToolArguments
} from "../plugins/codex/servers/codex-mcp-server.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVER = path.join(ROOT, "plugins", "codex", "servers", "codex-mcp-server.mjs");

test("defines separate read-only, write, and review tools", () => {
  assert.deepEqual(
    TOOL_DEFINITIONS.map((tool) => tool.name),
    ["codex_investigate", "codex_implement", "codex_review"]
  );
  assert.equal(TOOL_DEFINITIONS[0].annotations.readOnlyHint, true);
  assert.equal(TOOL_DEFINITIONS[1].annotations.readOnlyHint, false);
  assert.equal(TOOL_DEFINITIONS[2].annotations.readOnlyHint, true);
});

test("builds a read-only ephemeral Codex invocation", () => {
  const options = normalizeToolArguments("codex_investigate", {
    prompt: "inspect the build",
    model: "gpt-5.5",
    effort: "high",
    timeout_seconds: 60
  });
  const invocation = buildCodexInvocation("codex_investigate", options, "D:\\repo");
  assert.deepEqual(invocation.args, [
    "exec",
    "--ephemeral",
    "--sandbox", "read-only",
    "--cd", "D:\\repo",
    "--model", "gpt-5.5",
    "--config", "model_reasoning_effort=\"high\"",
    "-"
  ]);
  assert.equal(invocation.stdin, "inspect the build");
});

test("builds an explicitly write-capable invocation", () => {
  const options = normalizeToolArguments("codex_implement", {
    prompt: "apply the fix"
  });
  const invocation = buildCodexInvocation("codex_implement", options, "D:\\repo");
  assert.equal(invocation.args[3], "workspace-write");
  assert.equal(invocation.stdin, "apply the fix");
});

test("validates review targets and builds native review arguments", () => {
  assert.throws(
    () => normalizeToolArguments("codex_review", { target: "base" }),
    /reference is required/
  );
  const options = normalizeToolArguments("codex_review", {
    target: "base",
    reference: "main",
    prompt: "focus on races"
  });
  const invocation = buildCodexInvocation("codex_review", options, "D:\\repo");
  assert.deepEqual(invocation.args.slice(-3), ["--base", "main", "-"]);
  assert.equal(invocation.stdin, "focus on races");
});

test("stdio server completes initialize and tools/list", async (t) => {
  const child = spawn(process.execPath, [SERVER], {
    cwd: ROOT,
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true
  });
  t.after(() => child.kill());

  const responses = new Map();
  const waiters = new Map();
  const lines = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
  lines.on("line", (line) => {
    const message = JSON.parse(line);
    responses.set(message.id, message);
    waiters.get(message.id)?.(message);
  });

  function request(id, method, params = {}) {
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    if (responses.has(id)) {
      return Promise.resolve(responses.get(id));
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), 5000);
      waiters.set(id, (message) => {
        clearTimeout(timer);
        resolve(message);
      });
    });
  }

  const initialized = await request(1, "initialize", { protocolVersion: "2025-06-18" });
  assert.equal(initialized.result.serverInfo.name, "codex-cli");

  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);
  const listed = await request(2, "tools/list");
  assert.equal(listed.result.tools.length, 3);
  assert.deepEqual(listed.result.tools.map((tool) => tool.name), [
    "codex_investigate",
    "codex_implement",
    "codex_review"
  ]);
});
