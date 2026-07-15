#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ALLOWED_SUFFIXES = [".xlgames.com", ".xlgames.corp"];
const MAX_TEXT_BYTES = 5 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 60_000;

export function validateInternalUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("A valid absolute URL is required."); }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only HTTP and HTTPS URLs are allowed.");
  if (!ALLOWED_SUFFIXES.some((suffix) => url.hostname.toLowerCase().endsWith(suffix))) {
    throw new Error(`Host is outside the allowed X7 domains: ${url.hostname}`);
  }
  if (url.port || url.username || url.password) throw new Error("Ports and URL credentials are not allowed.");
  return url;
}

const BROWSERS = {
  chrome: { displayName: "Google Chrome" },
  edge: { displayName: "Microsoft Edge" },
  whale: { displayName: "NAVER Whale" }
};

function browserCandidates(id, env, platform) {
  const programFiles = env.PROGRAMFILES ?? "C:\\Program Files";
  const programFilesX86 = env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)";
  const localAppData = env.LOCALAPPDATA ?? "";
  if (platform === "win32") {
    if (id === "chrome") return [
      path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe")
    ];
    if (id === "edge") return [
      path.join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(localAppData, "Microsoft", "Edge", "Application", "msedge.exe")
    ];
    return [
      path.join(localAppData, "Naver", "Naver Whale", "Application", "whale.exe"),
      path.join(programFiles, "Naver", "Naver Whale", "Application", "whale.exe"),
      path.join(programFilesX86, "Naver", "Naver Whale", "Application", "whale.exe")
    ];
  }
  if (platform === "darwin") {
    if (id === "chrome") return ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
    if (id === "edge") return ["/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"];
    return ["/Applications/Naver Whale.app/Contents/MacOS/Whale"];
  }
  if (id === "chrome") return ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  if (id === "edge") return ["/usr/bin/microsoft-edge", "/usr/bin/microsoft-edge-stable"];
  return ["/usr/bin/naver-whale", "/usr/bin/whale"];
}

export function detectDefaultBrowser(platform = process.platform) {
  if (platform === "win32") {
    const result = spawnSync("reg.exe", ["query", "HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\https\\UserChoice", "/v", "ProgId"], { encoding: "utf8", windowsHide: true });
    const progId = result.status === 0 ? result.stdout.match(/ProgId\s+REG_SZ\s+(\S+)/i)?.[1]?.toLowerCase() : undefined;
    if (progId?.includes("edge")) return "edge";
    if (progId?.includes("whale")) return "whale";
    if (progId?.includes("chrome")) return "chrome";
    if (progId?.includes("firefox")) return "firefox";
    if (progId?.includes("brave")) return "brave";
    return undefined;
  }
  if (platform === "linux") {
    const result = spawnSync("xdg-settings", ["get", "default-web-browser"], { encoding: "utf8" });
    const desktop = result.status === 0 ? result.stdout.trim().toLowerCase() : "";
    if (desktop.includes("edge")) return "edge";
    if (desktop.includes("whale")) return "whale";
    if (desktop.includes("chrome") || desktop.includes("chromium")) return "chrome";
    if (desktop.includes("firefox")) return "firefox";
    if (desktop.includes("brave")) return "brave";
  }
  return undefined;
}

export function findChromiumBrowser(env = process.env, platform = process.platform, options = {}) {
  const exists = options.existsSync ?? fs.existsSync;
  const requested = (env.X7_INTERNAL_BROWSER ?? "auto").toLowerCase();
  if (!["auto", ...Object.keys(BROWSERS), "firefox", "brave"].includes(requested)) {
    throw new Error("X7_INTERNAL_BROWSER must be auto, chrome, edge, or whale. Firefox and Brave are not supported yet.");
  }
  if (requested === "firefox" || requested === "brave") throw new Error(`${requested} is not supported yet. Use chrome, edge, or whale.`);

  const customPath = env.X7_INTERNAL_BROWSER_PATH || env.X7_INTERNAL_CHROME_PATH;
  if (customPath) {
    if (!exists(customPath)) throw new Error(`Configured browser executable was not found: ${customPath}`);
    const executableName = path.basename(customPath).toLowerCase();
    const inferred = executableName.includes("msedge") ? "edge" : executableName.includes("whale") ? "whale" : executableName.includes("chrome") ? "chrome" : undefined;
    const id = requested === "auto" ? (env.X7_INTERNAL_CHROME_PATH ? "chrome" : inferred) : requested;
    if (!id) throw new Error("Set X7_INTERNAL_BROWSER to chrome, edge, or whale when the custom executable name cannot be recognized.");
    return { id, displayName: BROWSERS[id].displayName, executable: customPath };
  }

  const defaultBrowser = requested === "auto" ? (options.defaultBrowser ?? detectDefaultBrowser(platform)) : undefined;
  const order = requested === "auto"
    ? [defaultBrowser, "chrome", "edge", "whale"].filter((id, index, values) => BROWSERS[id] && values.indexOf(id) === index)
    : [requested];
  for (const id of order) {
    const executable = browserCandidates(id, env, platform).find((candidate) => candidate && exists(candidate));
    if (executable) return { id, displayName: BROWSERS[id].displayName, executable };
  }
  throw new Error(`No supported browser was found${requested === "auto" ? "" : ` for ${requested}`}. Install Chrome, Edge, or Whale, or set X7_INTERNAL_BROWSER_PATH.`);
}

export function findChromeExecutable(env = process.env, platform = process.platform) {
  return findChromiumBrowser({ ...env, X7_INTERNAL_BROWSER: "chrome" }, platform).executable;
}

class CdpPipe {
  constructor(child) {
    this.child = child;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Set();
    this.buffer = "";
    child.stdio[4].setEncoding("utf8");
    child.stdio[4].on("data", (chunk) => this.consume(chunk));
    child.on("error", (error) => this.failAll(error));
    child.on("exit", (code) => this.failAll(new Error(`Browser exited with code ${code}.`)));
  }
  consume(chunk) {
    this.buffer += chunk;
    for (;;) {
      const boundary = this.buffer.indexOf("\0");
      if (boundary < 0) return;
      const raw = this.buffer.slice(0, boundary);
      this.buffer = this.buffer.slice(boundary + 1);
      if (!raw) continue;
      const message = JSON.parse(raw);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (pending) {
          this.pending.delete(message.id);
          message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result ?? {});
        }
      } else {
        for (const listener of this.listeners) listener(message);
      }
    }
  }
  failAll(error) {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }
  command(method, params = {}, sessionId) {
    const id = this.nextId++;
    const message = { id, method, params, ...(sessionId ? { sessionId } : {}) };
    this.child.stdio[3].write(`${JSON.stringify(message)}\0`);
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  waitFor(predicate, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.listeners.delete(listener); reject(new Error("Browser navigation timed out.")); }, timeoutMs);
      const listener = (message) => {
        if (!predicate(message)) return;
        clearTimeout(timer);
        this.listeners.delete(listener);
        resolve(message);
      };
      this.listeners.add(listener);
    });
  }
}

let browser;
async function getBrowser() {
  if (browser && browser.child.exitCode === null) return browser;
  const selected = findChromiumBrowser();
  const profile = process.env.X7_INTERNAL_BROWSER_PROFILE || path.join(os.homedir(), ".x7-internal-browser", selected.id);
  fs.mkdirSync(profile, { recursive: true });
  const child = spawn(selected.executable, [
    `--user-data-dir=${profile}`,
    "--remote-debugging-pipe",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank"
  ], { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"], windowsHide: false });
  browser = new CdpPipe(child);
  browser.id = selected.id;
  browser.displayName = selected.displayName;
  await browser.command("Browser.getVersion");
  return browser;
}

function waitForNetworkIdle(cdp, sessionId, idleMs, maxWaitMs) {
  return new Promise((resolve) => {
    let idleTimer;
    const maxTimer = setTimeout(finish, maxWaitMs);
    function finish() {
      clearTimeout(idleTimer);
      clearTimeout(maxTimer);
      cdp.listeners.delete(listener);
      resolve();
    }
    function resetIdle() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(finish, idleMs);
    }
    const listener = (message) => {
      if (message.sessionId !== sessionId) return;
      if (message.method === "Network.responseReceived" || message.method === "Network.requestWillBeSent") resetIdle();
    };
    cdp.listeners.add(listener);
    resetIdle();
  });
}

async function readAuthenticatedPage(rawUrl, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const requested = validateInternalUrl(rawUrl);
  const isGitlab = /gitlab/i.test(requested.hostname);
  const noteId = /^#note_(\d+)$/.exec(requested.hash)?.[1];
  const cdp = await getBrowser();
  const { targetId } = await cdp.command("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.command("Target.attachToTarget", { targetId, flatten: true });
  await cdp.command("Page.enable", {}, sessionId);
  await cdp.command("Network.enable", {}, sessionId);
  let documentStatus;
  const responsePromise = cdp.waitFor((message) => {
    if (message.sessionId !== sessionId || message.method !== "Network.responseReceived") return false;
    if (message.params?.type !== "Document") return false;
    documentStatus = message.params.response?.status;
    return true;
  }, timeoutMs).catch(() => undefined);
  const loadPromise = cdp.waitFor((message) => message.sessionId === sessionId && message.method === "Page.loadEventFired", timeoutMs);
  await cdp.command("Page.navigate", { url: requested.toString() }, sessionId);
  await Promise.all([loadPromise, responsePromise]);
  // GitLab (and similar SPAs) keep loading discussion/comment content well after
  // the load event fires; wait for network activity to settle before reading.
  await waitForNetworkIdle(cdp, sessionId, isGitlab ? 900 : 400, isGitlab ? 6000 : 1500);
  const { result } = await cdp.command("Runtime.evaluate", {
    expression: `JSON.stringify({url:location.href,title:document.title,contentType:document.contentType,text:document.body?.innerText??"",hasPassword:Boolean(document.querySelector('input[type="password"]')),focusedComment:${noteId ? `document.getElementById(${JSON.stringify(`note_${noteId}`)})?.innerText ?? null` : "null"}})`,
    returnByValue: true
  }, sessionId);
  const page = JSON.parse(result?.value ?? "{}");
  try {
    validateInternalUrl(page.url);
  } catch {
    throw new Error(`The browser is showing an external sign-in page. Complete sign-in in the visible ${cdp.displayName} window, then retry the internal URL.`);
  }
  const text = String(page.text ?? "");
  if (Buffer.byteLength(text, "utf8") > MAX_TEXT_BYTES) throw new Error("Browser page text exceeds the 5 MiB limit.");
  const authenticationLikelyRequired = Boolean(page.hasPassword) || /\b(sign[ -]?in|log[ -]?in)\b/i.test(page.title ?? "");
  return {
    browser: cdp.id,
    url: page.url,
    status: documentStatus,
    title: page.title,
    contentType: page.contentType,
    authenticationLikelyRequired,
    text,
    ...(page.focusedComment ? { focusedComment: page.focusedComment } : {})
  };
}

const tools = [{
  name: "browser_read_internal_url",
  description: "Read an allowlisted X7 intranet page in a visible, persistent Chrome, Edge, or Whale profile so the user can authenticate interactively.",
  inputSchema: { type: "object", properties: { url: { type: "string" }, timeout_seconds: { type: "integer", minimum: 5, maximum: 180 } }, required: ["url"], additionalProperties: false },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
}];

async function handle(message) {
  if (message.method === "initialize") return { protocolVersion: message.params?.protocolVersion ?? "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "x7-internal-browser", version: "0.1.0" } };
  if (message.method === "tools/list") return { tools };
  if (message.method === "tools/call") {
    if (message.params?.name !== tools[0].name) throw new Error("Unknown tool.");
    const seconds = message.params.arguments?.timeout_seconds ?? 60;
    const page = await readAuthenticatedPage(message.params.arguments?.url, seconds * 1000);
    return { content: [{ type: "text", text: JSON.stringify(page) }] };
  }
  return {};
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === path.resolve(fileURLToPath(import.meta.url))) {
  const lines = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  const closeBrowser = () => {
    if (browser?.child.exitCode === null) browser.child.kill();
  };
  lines.on("close", closeBrowser);
  process.on("SIGINT", () => { closeBrowser(); process.exit(0); });
  process.on("SIGTERM", () => { closeBrowser(); process.exit(0); });
  lines.on("line", async (line) => {
    let message;
    try {
      message = JSON.parse(line);
      if (message.id === undefined) return;
      const result = await handle(message);
      process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: message.id, result })}\n`);
    } catch (error) {
      if (message?.id !== undefined) process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: message.id, error: { code: -32000, message: error instanceof Error ? error.message : String(error) } })}\n`);
    }
  });
}
