#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const skillPath = path.resolve(scriptDirectory, "..", "skills", "model-routing", "SKILL.md");

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
  const skill = fs.readFileSync(skillPath, "utf8");
  const body = skill.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
  const additionalContext = [
    "The following shared Claude guidance is provided by the enabled guidance plugin.",
    body
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
