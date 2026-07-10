import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const plugin = path.join(root, "plugins", "ripgrep");

test("marketplace contains the ripgrep plugin", () => {
  const marketplace = JSON.parse(fs.readFileSync(path.join(root, ".claude-plugin", "marketplace.json"), "utf8"));
  const entry = marketplace.plugins.find((candidate) => candidate.name === "ripgrep");
  assert.ok(entry);
  assert.equal(entry.source, "./plugins/ripgrep");
});

test("ripgrep search skill keeps command-executing options blocked", () => {
  const skill = fs.readFileSync(path.join(plugin, "skills", "search", "SKILL.md"), "utf8");
  assert.match(skill, /^name: search$/m);
  assert.doesNotMatch(skill, /^allowed-tools:/m);
  assert.match(skill, /Never use `--pre`/);
  assert.match(skill, /`--hostname-bin`/);
  assert.match(skill, /Never use shell redirection/);
});
