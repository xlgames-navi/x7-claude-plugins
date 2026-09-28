#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const skillsDirectory = path.resolve(scriptDirectory, "..", "skills");

function readSkillBody(name) {
  const contents = fs.readFileSync(path.join(skillsDirectory, name, "SKILL.md"), "utf8");
  return contents.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
}

function readHookEventName() {
  try {
    const input = fs.readFileSync(0, "utf8").trim();
    if (!input) return "SessionStart";
    const payload = JSON.parse(input);
    return payload.hook_event_name === "SubagentStart" ? "SubagentStart" : "SessionStart";
  } catch {
    return "SessionStart";
  }
}

try {
  const modelRouting = readSkillBody("model-routing");
  const codexRouting = readSkillBody("codex-routing");
  const additionalContext = [
    "The following shared Claude guidance is provided by the enabled guidance plugin.",
    modelRouting,
    "The following Codex extension is conditional. Apply it only when its applicability requirements are met.",
    codexRouting
  ].join("\n\n");

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: readHookEventName(),
      additionalContext
    },
    suppressOutput: true
  }));
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
