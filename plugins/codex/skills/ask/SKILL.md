---
name: ask
description: Delegate a read-only investigation, plan, analysis, or research task to the local Codex CLI
argument-hint: "[--model <model>] [--effort <low|medium|high|xhigh>] <task>"
---

Use the `codex_investigate` MCP tool exactly once for this request:

$ARGUMENTS

Parse optional leading `--model` and `--effort` routing flags. Send the remaining
text unchanged as the tool's `prompt`. If a routing flag is absent, omit that
field so the server uses its configured default.

This is always a read-only Codex run. Do not change it to implementation mode,
inspect the repository yourself, or solve the task independently. Return the
Codex result verbatim without commentary before or after it. Attempt the MCP
tool call even when the Claude session is in Plan Mode; allow Claude Code's
permission system to decide whether approval is required.
