#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const skillPath = path.resolve(scriptDirectory, "..", "skills", "model-routing", "SKILL.md");

try {
  const skill = fs.readFileSync(skillPath, "utf8");
  const body = skill.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
  const additionalContext = [
    "The following model-routing information is provided by the enabled codex plugin.",
    body
  ].join("\n\n");

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext
    },
    suppressOutput: true
  }));
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
