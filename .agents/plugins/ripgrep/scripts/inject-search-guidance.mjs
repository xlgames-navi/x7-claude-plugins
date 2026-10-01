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
  const search = readSkillBody("search");
  const additionalContext = [
    "The following shared search guidance is provided by the enabled ripgrep plugin.",
    "Decide autonomously, without waiting to be asked: for a search that would otherwise need chaining several find/grep-style Bash commands (multiple type or glob filters, combined file-name and content matching, candidate reduction followed by a narrower re-search), prefer this ripgrep workflow over hand-rolled find+grep pipelines. For a single simple pattern or filename lookup, keep using the built-in Grep/Glob tools — this guidance never blocks or discourages any other tool call.",
    search
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
