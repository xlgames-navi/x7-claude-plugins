import assert from "node:assert/strict";
import path from "node:path";
import readline from "node:readline";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const server = path.join(root, "plugins", "codex", "servers", "codex-mcp-server.mjs");
const child = spawn(process.execPath, [server], {
  cwd: root,
  env: {
    ...process.env,
    CLAUDE_PROJECT_DIR: root
  },
  stdio: ["pipe", "pipe", "inherit"],
  windowsHide: true
});

const waiters = new Map();
const lines = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
lines.on("line", (line) => {
  const message = JSON.parse(line);
  waiters.get(message.id)?.(message);
});

function request(id, method, params = {}) {
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), 60000);
    waiters.set(id, (message) => {
      clearTimeout(timer);
      waiters.delete(id);
      resolve(message);
    });
  });
}

try {
  await request(1, "initialize", { protocolVersion: "2025-06-18" });
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);
  const response = await request(2, "tools/call", {
    name: "codex_investigate",
    arguments: {
      prompt: "Return exactly the text MCP_CODEX_OK and do not use tools.",
      model: "gpt-5.5",
      effort: "low",
      timeout_seconds: 60
    }
  });
  assert.equal(response.result.isError, undefined, response.result.content?.[0]?.text);
  assert.equal(response.result.content[0].text.trim(), "MCP_CODEX_OK");
  process.stdout.write("MCP_CODEX_OK\n");
} finally {
  lines.close();
  child.stdin.end();
  child.kill();
}
