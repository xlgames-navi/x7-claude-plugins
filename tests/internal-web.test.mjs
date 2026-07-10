import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { validateInternalUrl } from "../plugins/internal-web/scripts/read-internal-url.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(root, "plugins", "internal-web", "scripts", "read-internal-url.mjs");

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

test("wrapper blocks a public URL before invoking curl", () => {
  const result = spawnSync(process.execPath, [script, "https://example.com/"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /outside the allowed X7 domains/);
});
