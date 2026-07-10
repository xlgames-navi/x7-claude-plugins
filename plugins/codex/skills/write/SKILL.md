---
name: write
description: Delegate an explicitly write-capable implementation or fix to the local Codex CLI
argument-hint: "[--model <model>] [--effort <low|medium|high|xhigh>] <task>"
disable-model-invocation: true
---

The user explicitly invoked the write-capable skill. Use the `codex_implement`
MCP tool exactly once for this request:

$ARGUMENTS

Parse optional leading `--model` and `--effort` routing flags. Send the remaining
text unchanged as the tool's `prompt`. If a routing flag is absent, omit that
field so the server uses its configured default.

Do not inspect the repository or modify files on the Claude side. Return the
Codex result verbatim without commentary before or after it. Never invoke this
skill automatically; it requires explicit user invocation because it grants
Codex workspace-write access.
