import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readSkill = (...parts) => fs.readFileSync(path.join(root, "plugins", ...parts, "skills", "model-routing", "SKILL.md"), "utf8");

test("each host receives only its own model-routing table", () => {
  const claude = readSkill("guidance");
  const codex = readSkill("codex-guidance");
  const antigravity = readSkill("antigravity-guidance");

  assert.match(claude, /`sonnet-5`/);
  assert.doesNotMatch(claude, /`gpt-5\.5`|`gemini-3\.5-flash`/);
  assert.match(codex, /`gpt-5\.5`/);
  assert.match(codex, /`gpt-5\.6-luna`/);
  assert.match(codex, /\| `gpt-5\.6-sol` \| 1 \| 9 \| 9 \|/);
  assert.match(codex, /\| `gpt-5\.6-terra` \| 2 \| 8 \| 8 \|/);
  assert.match(codex, /\| `gpt-5\.6-luna` \| 5 \| 7 \| 7 \|/);
  assert.match(codex, /\| `gpt-5\.5` \| 1 \| 8 \| 8 \|/);
  assert.doesNotMatch(codex, /`sonnet-5`|`gemini-3\.5-flash`/);
  assert.match(antigravity, /`gemini-3\.5-flash`/);
  assert.doesNotMatch(antigravity, /`sonnet-5`|`gpt-5\.5`/);
});

test("Codex and Antigravity guidance are registered only in their host packages", () => {
  const codexMarketplace = JSON.parse(fs.readFileSync(path.join(root, ".agents", "plugins", "marketplace.json"), "utf8"));
  const claudeMarketplace = JSON.parse(fs.readFileSync(path.join(root, ".claude-plugin", "marketplace.json"), "utf8"));
  assert.ok(codexMarketplace.plugins.some(({ name }) => name === "codex-guidance"));
  assert.ok(claudeMarketplace.plugins.some(({ name }) => name === "guidance"));
  assert.ok(!claudeMarketplace.plugins.some(({ name }) => name === "codex-guidance" || name === "antigravity-guidance"));
});
