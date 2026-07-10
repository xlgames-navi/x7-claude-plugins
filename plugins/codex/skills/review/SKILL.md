---
name: review
description: Run a native read-only Codex review for uncommitted changes, a base branch, or a commit
argument-hint: "[--model <model>] [--effort <level>] [--uncommitted|--base <ref>|--commit <sha>] [focus]"
---

Use the `codex_review` MCP tool exactly once for this request:

$ARGUMENTS

Parse optional leading routing flags:

- `--model <model>` and `--effort <low|medium|high|xhigh>` select runtime values.
- `--uncommitted` maps to target `uncommitted`.
- `--base <ref>` maps to target `base` and passes `<ref>` as `reference`.
- `--commit <sha>` maps to target `commit` and passes `<sha>` as `reference`.

Use target `uncommitted` when no review target is supplied. Send all remaining
text as the optional review `prompt`. Do not inspect the repository or perform
an independent review. Return the Codex result verbatim without commentary
before or after it.
