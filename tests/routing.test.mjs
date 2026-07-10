import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const plugin = path.join(root, "plugins", "codex");

test("router agent uses MCP safety boundaries without permissionMode", () => {
  const agent = fs.readFileSync(path.join(plugin, "agents", "codex-router.md"), "utf8");
  assert.match(agent, /^name: codex-router$/m);
  assert.match(agent, /^skills:\r?\n  - model-routing$/m);
  assert.doesNotMatch(agent, /^permissionMode:/m);
  assert.match(agent, /codex_investigate/);
  assert.match(agent, /codex_implement/);
  assert.match(agent, /codex_review/);
});

test("routing policy references the bundled plugin rather than Codex Plugin CC", () => {
  const skill = fs.readFileSync(path.join(plugin, "skills", "model-routing", "SKILL.md"), "utf8");
  assert.match(skill, /\/codex:ask/);
  assert.match(skill, /\/codex:write/);
  assert.match(skill, /\/codex:review/);
  assert.doesNotMatch(skill, /Codex Plugin CC/i);
});

test("SessionStart hook emits bounded structured additionalContext", () => {
  const script = path.join(plugin, "scripts", "inject-model-routing.mjs");
  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true
  });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.hookSpecificOutput.hookEventName, "SessionStart");
  assert.match(output.hookSpecificOutput.additionalContext, /Team model-routing policy/);
  assert.ok(output.hookSpecificOutput.additionalContext.length < 10000);
});
