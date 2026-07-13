import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { validateInternalUrl } from "../plugins/internal-web/scripts/read-internal-url.mjs";
import { findChromiumBrowser, validateInternalUrl as validateBrowserUrl } from "../plugins/internal-web/servers/browser-mcp-server.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(root, "plugins", "internal-web", "scripts", "read-internal-url.mjs");
const server = path.join(root, "plugins", "internal-web", "servers", "browser-mcp-server.mjs");

test("internal URL validator allows subdomains under the two X7 domains", () => {
  assert.equal(validateInternalUrl("https://x7.xlgames.com/path").hostname, "x7.xlgames.com");
  assert.equal(validateInternalUrl("https://x7jenkins.xlgames.com/job/a").hostname, "x7jenkins.xlgames.com");
  assert.equal(validateInternalUrl("https://service.xlgames.corp/api").hostname, "service.xlgames.corp");
  assert.equal(validateInternalUrl("https://nested.service.xlgames.corp/api").hostname, "nested.service.xlgames.corp");
  assert.throws(() => validateInternalUrl("https://xlgames.com/"), /outside the allowed/);
  assert.throws(() => validateInternalUrl("https://xlgames.corp/"), /outside the allowed/);
  assert.throws(() => validateInternalUrl("https://evilxlgames.com/"), /outside the allowed/);
  assert.throws(() => validateInternalUrl("https://x7.xlgames.com.evil.example/"), /outside the allowed/);
  assert.throws(() => validateInternalUrl("https://user:secret@x7.xlgames.com/"), /Credentials/);
  assert.throws(() => validateInternalUrl("https://x7.xlgames.com:8443/"), /ports/);
  assert.throws(() => validateInternalUrl("file:///etc/passwd"), /HTTP and HTTPS/);
});

test("browser validator applies the same URL boundary", () => {
  assert.equal(validateBrowserUrl("https://wiki.xlgames.corp/page").hostname, "wiki.xlgames.corp");
  assert.throws(() => validateBrowserUrl("https://wiki.xlgames.corp.evil.example/"), /outside the allowed/);
  assert.throws(() => validateBrowserUrl("https://wiki.xlgames.corp:8443/"), /Ports/);
  assert.throws(() => validateBrowserUrl("https://user:secret@wiki.xlgames.corp/"), /credentials/);
});

test("browser selection prefers a supported Windows default browser", () => {
  const env = { PROGRAMFILES: "C:\\Program Files", "PROGRAMFILES(X86)": "C:\\Program Files (x86)", LOCALAPPDATA: "C:\\Users\\dev\\AppData\\Local" };
  const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const selected = findChromiumBrowser(env, "win32", { defaultBrowser: "edge", existsSync: (candidate) => candidate === edge });
  assert.deepEqual(selected, { id: "edge", displayName: "Microsoft Edge", executable: edge });
});

test("browser selection falls back from an unsupported default and supports explicit Whale", () => {
  const env = { PROGRAMFILES: "C:\\Program Files", "PROGRAMFILES(X86)": "C:\\Program Files (x86)", LOCALAPPDATA: "C:\\Users\\dev\\AppData\\Local" };
  const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  assert.equal(findChromiumBrowser(env, "win32", { defaultBrowser: "firefox", existsSync: (candidate) => candidate === chrome }).id, "chrome");
  const whale = "C:\\Users\\dev\\AppData\\Local\\Naver\\Naver Whale\\Application\\whale.exe";
  assert.equal(findChromiumBrowser({ ...env, X7_INTERNAL_BROWSER: "whale" }, "win32", { existsSync: (candidate) => candidate === whale }).executable, whale);
  assert.throws(() => findChromiumBrowser({ ...env, X7_INTERNAL_BROWSER: "firefox" }, "win32", { existsSync: () => true }), /not supported yet/);
  assert.throws(() => findChromiumBrowser({ ...env, X7_INTERNAL_BROWSER: "brave" }, "win32", { existsSync: () => true }), /not supported yet/);
});

test("browser selection recognizes a custom Chromium executable", () => {
  const executable = "D:\\Apps\\Microsoft\\Edge\\msedge.exe";
  const selected = findChromiumBrowser({ X7_INTERNAL_BROWSER_PATH: executable }, "win32", { existsSync: () => true });
  assert.deepEqual(selected, { id: "edge", displayName: "Microsoft Edge", executable });
});

test("browser MCP server advertises the authenticated read-only tool", async (t) => {
  const child = spawn(process.execPath, [server], { cwd: root, stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
  t.after(() => child.kill());
  let output = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { output += chunk; });
  const request = (id, method, params = {}) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`MCP response timed out: ${output}`)), 3000);
    const inspect = () => {
      const line = output.split("\n").find((value) => {
        try { return JSON.parse(value).id === id; } catch { return false; }
      });
      if (!line) return;
      clearTimeout(timer);
      child.stdout.off("data", inspect);
      resolve(JSON.parse(line));
    };
    child.stdout.on("data", inspect);
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    inspect();
  });
  const initialized = await request(1, "initialize", { protocolVersion: "2025-06-18" });
  assert.equal(initialized.result.serverInfo.name, "x7-internal-browser");
  const listed = await request(2, "tools/list");
  assert.equal(listed.result.tools[0].name, "browser_read_internal_url");
  assert.equal(listed.result.tools[0].annotations.readOnlyHint, true);
});

test("host-specific MCP configuration points to the browser server", () => {
  const plugin = path.join(root, "plugins", "internal-web");
  const claude = JSON.parse(fs.readFileSync(path.join(plugin, ".mcp.json"), "utf8"));
  const codexManifest = JSON.parse(fs.readFileSync(path.join(plugin, ".codex-plugin", "plugin.json"), "utf8"));
  const antigravity = JSON.parse(fs.readFileSync(path.join(plugin, "mcp_config.json"), "utf8"));
  assert.match(claude.mcpServers["x7-internal-browser"].args[0], /CLAUDE_PLUGIN_ROOT/);
  assert.equal(codexManifest.mcpServers["x7-internal-browser"].cwd, ".");
  assert.equal(codexManifest.mcpServers["x7-internal-browser"].args[0], "./servers/browser-mcp-server.mjs");
  assert.equal(antigravity.mcpServers["x7-internal-browser"].args[0], "./servers/browser-mcp-server.mjs");
});

test("wrapper blocks a public URL before invoking curl", () => {
  const result = spawnSync(process.execPath, [script, "https://example.com/"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /outside the allowed X7 domains/);
});
