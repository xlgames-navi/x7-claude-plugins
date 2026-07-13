#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ALLOWED_DOMAIN_SUFFIXES = [".xlgames.com", ".xlgames.corp"];
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 5;
const MAX_BYTES = 5 * 1024 * 1024;

function isAllowedHostname(hostname) {
  const normalized = hostname.toLowerCase();
  return ALLOWED_DOMAIN_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

export function validateInternalUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("A valid absolute URL is required.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only HTTP and HTTPS URLs are allowed.");
  }
  if (!isAllowedHostname(url.hostname)) {
    throw new Error(`Host is outside the allowed X7 domains: ${url.hostname}`);
  }
  if (url.port) {
    throw new Error("Explicit non-default ports are not allowed.");
  }
  if (url.username || url.password) {
    throw new Error("Credentials in URLs are not allowed.");
  }
  return url;
}

function safeDisplayUrl(url) {
  return `${url.origin}${url.pathname}`;
}

function parseHeaders(rawHeaders) {
  const blocks = rawHeaders
    .split(/\r?\n\r?\n/)
    .map((block) => block.trim())
    .filter((block) => /^HTTP\/\S+\s+\d{3}/i.test(block));
  const block = blocks.at(-1);
  if (!block) throw new Error("curl returned no HTTP response headers.");

  const lines = block.split(/\r?\n/);
  const statusMatch = lines[0].match(/^HTTP\/\S+\s+(\d{3})/i);
  if (!statusMatch) throw new Error("Could not parse the HTTP status.");

  const headers = new Map();
  for (const line of lines.slice(1)) {
    const separator = line.indexOf(":");
    if (separator <= 0) continue;
    headers.set(line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim());
  }
  return { status: Number(statusMatch[1]), headers };
}

function isTextContentType(contentType) {
  const mime = contentType.split(";", 1)[0].trim().toLowerCase();
  return mime.startsWith("text/") || [
    "application/json",
    "application/ld+json",
    "application/problem+json",
    "application/xml",
    "application/xhtml+xml",
    "application/javascript",
    "application/x-javascript",
    "application/yaml",
    "application/x-yaml"
  ].includes(mime) || mime.endsWith("+json") || mime.endsWith("+xml");
}

export function main(argv = process.argv.slice(2)) {
  if (argv.length !== 1) {
    throw new Error("Usage: read-internal-url.mjs <URL>");
  }

  let currentUrl = validateInternalUrl(argv[0]);
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "x7-internal-web-"));
  const headerPath = path.join(temporaryDirectory, "headers.txt");
  const cookiePath = path.join(temporaryDirectory, "cookies.txt");
  fs.writeFileSync(cookiePath, "", { mode: 0o600 });

  try {
    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      fs.writeFileSync(headerPath, "", { mode: 0o600 });
      const curlExecutable = process.platform === "win32" ? "curl.exe" : "curl";
      const result = spawnSync(curlExecutable, [
        "--silent",
        "--show-error",
        "--request", "GET",
        "--connect-timeout", "10",
        "--max-time", "30",
        "--max-filesize", String(MAX_BYTES),
        "--proto", "=http,https",
        "--header", "Accept: text/html,application/json,application/xml,text/plain;q=0.9,*/*;q=0.1",
        "--dump-header", headerPath,
        "--cookie", cookiePath,
        "--cookie-jar", cookiePath,
        "--output", "-",
        currentUrl.toString()
      ], {
        encoding: "buffer",
        maxBuffer: MAX_BYTES + 1024 * 1024,
        windowsHide: true,
        shell: false
      });

      if (result.error) throw result.error;
      if (result.status !== 0) {
        const stderr = result.stderr.toString("utf8").replaceAll(currentUrl.toString(), safeDisplayUrl(currentUrl)).trim();
        throw new Error(`Local curl failed with exit code ${result.status}${stderr ? `: ${stderr}` : ""}`);
      }

      const { status, headers } = parseHeaders(fs.readFileSync(headerPath, "utf8"));
      if (REDIRECT_STATUSES.has(status)) {
        if (redirectCount === MAX_REDIRECTS) throw new Error("Too many redirects.");
        const location = headers.get("location");
        if (!location) throw new Error(`HTTP ${status} response has no Location header.`);
        currentUrl = validateInternalUrl(new URL(location, currentUrl).toString());
        continue;
      }

      const contentType = headers.get("content-type") ?? "";
      if (contentType && !isTextContentType(contentType)) {
        throw new Error(`Refusing to print non-text response: ${contentType}`);
      }
      const body = result.stdout.toString("utf8");
      if (!contentType && body.includes("\u0000")) {
        throw new Error("Refusing to print a binary response with no Content-Type.");
      }

      process.stdout.write([
        `URL: ${safeDisplayUrl(currentUrl)}`,
        `Status: ${status}`,
        `Content-Type: ${contentType || "unknown"}`,
        "",
        body
      ].join("\n"));
      return;
    }
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === path.resolve(fileURLToPath(import.meta.url))) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
