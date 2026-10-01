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
  assert.match(skill, /pre-existing changes outside submodule paths/);
  assert.match(skill, /Treat changes confined to\s+submodule paths, including modified gitlink pointers and changes inside a\s+submodule worktree, as an exception to this check/);
  assert.match(skill, /if Git refuses to start or continue the rebase because of them,\s+stop and report without stashing or discarding user changes/);
  assert.match(skill, /git rebase master/);
  assert.match(skill, /git -c core\.editor=true rebase --continue/);
  assert.match(skill, /Never use `git rebase --abort` or `git rebase --skip`/);
  assert.match(skill, /Never force-push/);
});

test("commit skill scopes X7 rules to XLGames subdomains", () => {
  const skill = fs.readFileSync(path.join(plugin, "skills", "commit", "SKILL.md"), "utf8");
  const openai = fs.readFileSync(path.join(plugin, "skills", "commit", "agents", "openai.yaml"), "utf8");
  assert.match(skill, /^name: commit$/m);
  assert.match(openai, /^\s*allow_implicit_invocation: false$/m);
  assert.match(skill, /`\*\.xlgames\.com` or `\*\.xlgames\.corp`/);
  assert.match(skill, /bare `xlgames\.com` and `xlgames\.corp` hosts do not match/);
  assert.match(skill, /reject\s+lookalike suffixes such as `xlgames\.com\.example\.org`/);
  assert.match(skill, /For every other remote host, skip the X7 issue prefix/);
  assert.match(skill, /follow the\s+repository's established subject, language, body, and change-grouping/);
  assert.match(skill, /Do not ask for an X7 GitLab issue ID or programmer commit number/);
  assert.match(skill, /x7\/x7#<GitLab issue ID> \(<programmer commit number>\)/);
  assert.match(skill, /Markdown list/);
  assert.match(skill, /equals `Generated`\s+case-insensitively/);
  assert.match(skill, /exactly one final commit/);
  assert.match(skill, /\) CodeGen/);
  assert.match(skill, /Do not add `Co-Authored-By`/);
  assert.match(skill, /Never invent the issue ID/);
  assert.match(skill, /\^\(\\d\+\)\(\?:-\|\$\)/);
  assert.match(skill, /`1234-`, `1234`, and `1234-1` all\s+produce issue ID `1234`/);
  assert.match(skill, /branch does not match, HEAD is detached/);
  assert.match(skill, /ask the user for the issue ID/);
  assert.match(skill, /no existing commit by the current author uses that issue ID/);
  assert.match(skill, /ask whether\s+to add programmer commit numbers/);
  assert.match(skill, /first new commit at `\(1\)`/);
  assert.match(skill, /omit the entire `\(<programmer commit number>\)` segment/);
  assert.match(skill, /x7\/x7#<GitLab issue ID> CodeGen/);
  assert.match(skill, /Never fetch, pull, push, force-push/);
});
