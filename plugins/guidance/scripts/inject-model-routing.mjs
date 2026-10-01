#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const skillsDirectory = path.resolve(scriptDirectory, "..", "skills");

function readSkillBody(name) {
  const contents = fs.readFileSync(path.join(skillsDirectory, name, "SKILL.md"), "utf8");
  return contents.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
}

// Only team_standard is a confirmed value. The organization types are
// unverified guesses; unrecognized values are allowed (fail-open).
const ineligibleSeatTiers = new Set(["team_standard"]);
const ineligibleOrganizationTypes = new Set(["claude_pro", "claude_free"]);

function detectFableEligibility() {
  try {
    const configDirectory = process.env.CLAUDE_CONFIG_DIR || os.homedir();
    const config = JSON.parse(fs.readFileSync(path.join(configDirectory, ".claude.json"), "utf8"));
    const { seatTier, organizationType } = config?.oauthAccount ?? {};
    if (ineligibleSeatTiers.has(seatTier)) return { status: "ineligible", reason: `seatTier=${seatTier}` };
    if (ineligibleOrganizationTypes.has(organizationType)) {
      return { status: "ineligible", reason: `organizationType=${organizationType}` };
    }
    return { status: "eligible", reason: `seatTier=${seatTier ?? "none"}, organizationType=${organizationType ?? "none"}` };
  } catch {
    return { status: "unknown", reason: "account metadata unavailable" };
  }
}

function describeFableEligibility({ status, reason }) {
  const prefix = `Fable eligibility for this account: ${status} (${reason}).`;
  if (status === "ineligible") return `${prefix} Do not select fable-5.1; use opus-5.5 instead.`;
  return `${prefix} fable-5.1 may be selected; if the call fails as unavailable, rerun with opus-5.5.`;
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
    describeFableEligibility(detectFableEligibility()),
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
