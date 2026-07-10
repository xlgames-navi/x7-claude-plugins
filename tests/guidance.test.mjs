import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const plugin = path.join(root, "plugins", "guidance");

test("marketplace contains the guidance plugin", () => {
  const marketplace = JSON.parse(fs.readFileSync(path.join(root, ".claude-plugin", "marketplace.json"), "utf8"));
  const entry = marketplace.plugins.find((candidate) => candidate.name === "guidance");
  assert.ok(entry);
  assert.equal(entry.source, "./plugins/guidance");
});

test("shared guidance contains Claude policy without Codex execution rules", () => {
  const skill = fs.readFileSync(path.join(plugin, "skills", "model-routing", "SKILL.md"), "utf8");
  assert.match(skill, /Team Claude model-routing policy/);
  assert.match(skill, /Never select Haiku/);
  assert.doesNotMatch(skill, /codex_/i);
  assert.doesNotMatch(skill, /\/codex:/i);
});

test("guidance hook emits structured context for sessions and subagents", () => {
  const script = path.join(plugin, "scripts", "inject-model-routing.mjs");
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
    assert.match(output.hookSpecificOutput.additionalContext, /Team Claude model-routing policy/);
    assert.ok(output.hookSpecificOutput.additionalContext.length < 10000);
  }
});
