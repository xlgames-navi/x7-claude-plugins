#!/usr/bin/env node

import fs from "node:fs";

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

const hookEventName = readHookEventName();
const additionalContext = hookEventName === "SubagentStart"
  ? [
      "This is a subagent/worker context.",
      "The GPT-6 Astra Advisor request is root-agent-only. Do not initiate or proxy an Advisor request, call multi_agent_v1__spawn_agent with gpt-6-astra for a new consultation, or spawn a child for that consultation.",
      "If the root explicitly assigned this worker as the GPT-6 Astra Advisor, answer that direct prompt read-only and do not recurse; otherwise use advice already supplied by the root agent and continue the assigned work without a consultation."
    ].join(" ")
  : [
      "This is the primary Claude task session.",
      "Before a consequential complex task, use the advisor skill for one read-only GPT-6 Astra second opinion when its trigger applies. A user request for Advisor or Astra help is an explicit trigger.",
      "Keep the consultation in the root session; subagents must never invoke or proxy it."
    ].join(" ");

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName,
    additionalContext
  },
  suppressOutput: true
}));
