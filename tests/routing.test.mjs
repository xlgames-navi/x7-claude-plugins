import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const plugin = path.join(root, "plugins", "codex");

test("codex declares the shared guidance plugin dependency", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(plugin, ".claude-plugin", "plugin.json"), "utf8"));
  assert.deepEqual(manifest.dependencies, ["guidance"]);
});

test("router agent uses Codex MCP safety boundaries without permissionMode", () => {
  const agent = fs.readFileSync(path.join(plugin, "agents", "codex-router.md"), "utf8");
  assert.match(agent, /^name: codex-router$/m);
  assert.match(agent, /^skills:\r?\n  - codex-routing$/m);
  assert.doesNotMatch(agent, /^permissionMode:/m);
  assert.match(agent, /codex_investigate/);
  assert.match(agent, /codex_implement/);
  assert.match(agent, /codex_review/);
});

test("Codex routing extension references the bundled plugin operations", () => {
  const skill = fs.readFileSync(path.join(plugin, "skills", "codex-routing", "SKILL.md"), "utf8");
  assert.match(skill, /\/codex:ask/);
  assert.match(skill, /\/codex:write/);
  assert.match(skill, /\/codex:review/);
  assert.doesNotMatch(skill, /Codex Plugin CC/i);
});

test("Codex hook emits structured context for sessions and subagents", () => {
  const script = path.join(plugin, "scripts", "inject-codex-routing.mjs");
  for (const hookEventName of ["SessionStart", "SubagentStart"]) {
    const result = spawnSync(process.execPath, [script], {
      cwd: root,
      input: JSON.stringify({ hook_event_name: hookEventName }),
      encoding: "utf8",
      windowsHide: true
    });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.hookSpecificOutput.hookEventName, hookEventName);
    assert.match(output.hookSpecificOutput.additionalContext, /Codex routing extension/);
    assert.ok(output.hookSpecificOutput.additionalContext.length < 10000);
  }
});
