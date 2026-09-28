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
const skillPath = path.join(root, "plugins", "internal-web", "skills", "read", "SKILL.md");

test("read skill packaging and routing rules stay aligned across hosts", () => {
  const skill = fs.readFileSync(skillPath, "utf8");
  const frontmatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/u)?.[1] ?? "";
  const frontmatterKeys = frontmatter.split(/\r?\n/u).filter((line) => /^[\w-]+:/u.test(line)).map((line) => line.split(":", 1)[0]).sort();
  assert.deepEqual(frontmatterKeys, ["description", "name"]);

  const claudeMarketplace = JSON.parse(fs.readFileSync(path.join(root, ".claude-plugin", "marketplace.json"), "utf8"));
  const codexMarketplace = JSON.parse(fs.readFileSync(path.join(root, ".agents", "plugins", "marketplace.json"), "utf8"));
  const claudeEntry = claudeMarketplace.plugins.find(({ name }) => name === "internal-web");
  const codexEntry = codexMarketplace.plugins.find(({ name }) => name === "internal-web");
  assert.equal(claudeEntry.source, "./plugins/internal-web");
  assert.equal(codexEntry.source.path, "./plugins/internal-web");
  assert.equal(codexEntry.policy.installation, "AVAILABLE");
  assert.equal(codexEntry.policy.authentication, "ON_INSTALL");
  assert.equal(codexEntry.category, "Developer Tools");

  const plugin = path.join(root, "plugins", "internal-web");
  const claudeManifest = JSON.parse(fs.readFileSync(path.join(plugin, ".claude-plugin", "plugin.json"), "utf8"));
  const codexManifest = JSON.parse(fs.readFileSync(path.join(plugin, ".codex-plugin", "plugin.json"), "utf8"));
  assert.equal(claudeManifest.name, "internal-web");
  assert.equal(codexManifest.name, claudeManifest.name);
  assert.equal(codexManifest.version, claudeManifest.version);
  assert.equal(codexManifest.skills, "./skills/");

  const metadata = fs.readFileSync(path.join(plugin, "skills", "read", "agents", "openai.yaml"), "utf8");
  assert.match(metadata, /display_name: "[^"]+"/u);
  const shortDescription = metadata.match(/short_description: "([^"]+)"/u)?.[1] ?? "";
  assert.ok(shortDescription.length >= 25 && shortDescription.length <= 64);
  assert.match(metadata, /default_prompt: "[^"]*\$read/u);

  const antigravityRoot = path.join(root, ".agents", "plugins", "internal-web");
  const antigravityManifest = JSON.parse(fs.readFileSync(path.join(antigravityRoot, "plugin.json"), "utf8"));
  assert.equal(antigravityManifest.name, "internal-web");
  assert.deepEqual(fs.readFileSync(path.join(antigravityRoot, "skills", "read", "SKILL.md")), fs.readFileSync(skillPath));

  const workflow = fs.readFileSync(path.join(root, ".agent", "workflows", "read.md"), "utf8");
  assert.match(workflow, /`read` skill/u);
  assert.match(workflow, /Forward the text following `\/read`/u);
  assert.match(workflow, /sign-in/u);
  assert.doesNotMatch(workflow, /run only its bundled guarded local wrapper/u);

  const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
  assert.match(readme, /Prefers connected GitLab and Jenkins MCPs/u);
  assert.match(readme, /already-open\s+embedded browser tab/u);
  assert.match(readme, /does not launch another browser for\s+authentication/u);
});

test("read skill routes GitLab and Jenkins through MCP and keeps sign-in in the embedded browser", () => {
  const skill = fs.readFileSync(skillPath, "utf8");
  assert.match(skill, /`x7\.xlgames\.com` \(GitLab\).*`x7jenkins\.xlgames\.com` \(Jenkins\)[\s\S]*?read-only tools first/u);
  assert.match(skill, /Prefer the current host application's built-in browser/u);
  assert.match(skill, /Do not launch a\s+separate Chrome, Edge, Whale, or browser-MCP session/u);
  assert.match(skill, /enter their credentials\s+directly in that already-open embedded browser tab, never in chat/u);
  assert.match(skill, /wait\s+for the user to say sign-in is complete/u);
  assert.match(skill, /Do not open another browser to handle\s+authentication/u);
  assert.match(skill, /only when the page is known\s+not to require\s+sign-in/u);
  assert.match(skill, /When reading GitLab in a browser, wait at least 3 seconds after navigation\s+completes before extracting page text/u);
  assert.match(skill, /if requested content is\s+still missing or visibly loading, wait at least 2 more seconds and check\s+again/u);
  assert.match(skill, /Do not use general-purpose remote web\/search services or delegated agents/u);
  assert.match(skill, /Only use read-only product MCP operations/u);
  assert.match(skill, /Do not persist response bodies, cookies, tokens, or credentials/u);
});

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
