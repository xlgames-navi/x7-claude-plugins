import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginNames = ["ripgrep", "git", "internal-web"];

test("Antigravity packages expose the canonical shared skills", () => {
  for (const pluginName of pluginNames) {
    const canonicalRoot = path.join(root, "plugins", pluginName);
    const antigravityRoot = path.join(root, ".agents", "plugins", pluginName);
    const manifest = JSON.parse(fs.readFileSync(path.join(antigravityRoot, "plugin.json"), "utf8"));
    assert.equal(manifest.$schema, "https://antigravity.google/schemas/v1/plugin.json");
    assert.equal(manifest.name, pluginName);

    const skillRoot = path.join(canonicalRoot, "skills");
    for (const skill of fs.readdirSync(skillRoot)) {
      const relativePath = path.join("skills", skill, "SKILL.md");
      assert.deepEqual(
        fs.readFileSync(path.join(antigravityRoot, relativePath)),
        fs.readFileSync(path.join(canonicalRoot, relativePath))
      );
    }
  }
});

test("Antigravity repository rule delegates to AGENTS.md", () => {
  const rule = fs.readFileSync(path.join(root, ".agents", "rules", "skill-authoring.md"), "utf8");
  assert.match(rule, /AGENTS\.md/);
  assert.match(rule, /sync:antigravity/);
});

test("Antigravity GUI workflows expose user-invocable skills as slash commands", () => {
  for (const skillName of ["search", "rebase-master", "read"]) {
    const workflow = fs.readFileSync(path.join(root, ".agent", "workflows", `${skillName}.md`), "utf8");
    assert.match(workflow, /^---\r?\ndescription:/m);
    assert.match(workflow, new RegExp(`Use the \`${skillName}\` skill`));
    assert.match(workflow, new RegExp(`/${skillName}`));
  }
});
