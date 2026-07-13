import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const plugin = path.join(root, "plugins", "git");

test("marketplace contains the git plugin", () => {
  const marketplace = JSON.parse(fs.readFileSync(path.join(root, ".claude-plugin", "marketplace.json"), "utf8"));
  const entry = marketplace.plugins.find((candidate) => candidate.name === "git");
  assert.ok(entry);
  assert.equal(entry.source, "./plugins/git");
});

test("rebase skill no-ops on master and protects destructive operations", () => {
  const skill = fs.readFileSync(path.join(plugin, "skills", "rebase-master", "SKILL.md"), "utf8");
  const openai = fs.readFileSync(path.join(plugin, "skills", "rebase-master", "agents", "openai.yaml"), "utf8");
  assert.match(skill, /^name: rebase-master$/m);
  assert.match(openai, /^\s*allow_implicit_invocation: false$/m);
  assert.match(skill, /branch is exactly `master`/);
  assert.match(skill, /git rebase master/);
  assert.match(skill, /git -c core\.editor=true rebase --continue/);
  assert.match(skill, /Never use `git rebase --abort` or `git rebase --skip`/);
  assert.match(skill, /Never force-push/);
});
