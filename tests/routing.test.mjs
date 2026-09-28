import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillRoot = path.join(root, "plugins", "guidance", "skills", "codex-routing");
const skillPath = path.join(skillRoot, "SKILL.md");

test("Codex routing is gated on the enabled OpenAI Claude Code plugin", () => {
  const skill = fs.readFileSync(skillPath, "utf8");
  const frontmatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/u)?.[1] ?? "";
  const frontmatterKeys = [...frontmatter.matchAll(/^([a-z-]+):/gmu)].map(([, key]) => key);

  assert.deepEqual(frontmatterKeys, ["name", "description"]);
  assert.match(frontmatter, /^name: codex-routing$/m);
  assert.match(skill, /only in Claude Code when `codex@openai-codex` is installed\s+and enabled/i);
  assert.match(skill, /commands and lists `codex:codex-rescue` in `\/agents`/);
  assert.match(skill, /do not require those skills to appear in the main session/);
  assert.match(skill, /not published for Codex or\s+Antigravity/);
  assert.match(skill, /codex-cli-runtime/);
  assert.match(skill, /gpt-5-4-prompting/);
  assert.match(skill, /codex-result-handling/);
  assert.match(skill, /\/codex:rescue/);
  assert.match(skill, /\/codex:review/);
  assert.match(skill, /\/codex:adversarial-review/);
  assert.match(skill, /do not hand-write `codex exec`/);
  assert.match(skill, /bypass the plugin's normal permission prompts/);
  assert.match(skill, /Only delegate implementation when the user asks for changes/);
  assert.doesNotMatch(skill, /codex_investigate|codex_implement|codex_review|\/codex:ask|\/codex:write/);
  assert.doesNotMatch(skill, /\$ARGUMENTS|\$\{CLAUDE_PLUGIN_ROOT\}/u);
});

test("Codex routing metadata is explicit and excluded from non-Claude packages", () => {
  const openai = fs.readFileSync(path.join(skillRoot, "agents", "openai.yaml"), "utf8");
  const guidance = JSON.parse(fs.readFileSync(path.join(root, "plugins", "guidance", ".claude-plugin", "plugin.json"), "utf8"));
  const claudeMarketplace = JSON.parse(fs.readFileSync(path.join(root, ".claude-plugin", "marketplace.json"), "utf8"));
  const codexMarketplace = JSON.parse(fs.readFileSync(path.join(root, ".agents", "plugins", "marketplace.json"), "utf8"));

  assert.match(openai, /display_name: "X7 Codex Routing"/);
  assert.match(openai, /short_description: ".+"/);
  assert.match(openai, /default_prompt: ".*\$codex-routing.*"/);
  assert.match(openai, /allow_implicit_invocation: false/);
  assert.equal(guidance.name, "guidance");
  assert.equal(guidance.dependencies, undefined);
  assert.ok(claudeMarketplace.plugins.some(({ name }) => name === "guidance"));
  assert.ok(!claudeMarketplace.plugins.some(({ name }) => name === "codex"));
  assert.ok(!fs.existsSync(path.join(root, "plugins", "codex")));
  assert.ok(!codexMarketplace.plugins.some(({ name }) => name === "guidance"));
  assert.ok(!fs.existsSync(path.join(root, ".agents", "plugins", "guidance")));
  assert.ok(!fs.existsSync(path.join(root, ".agent", "workflows", "codex-routing.md")));
});
