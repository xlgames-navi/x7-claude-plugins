---
name: delegate
description: Delegate a substantial task to the Codex router agent, which chooses read-only investigation, implementation, or review mode
argument-hint: "[--model <model>] [--effort <level>] <task>"
context: fork
agent: codex-router
---

Route the following self-contained request through exactly one bundled Codex MCP
tool. Preserve the task text and any explicit model, effort, or review-target
controls:

$ARGUMENTS
