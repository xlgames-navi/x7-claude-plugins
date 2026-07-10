---
name: codex-routing
description: Codex-specific extension to the shared team model-routing policy
user-invocable: false
---

# Codex routing extension

This policy adds OpenAI Codex as an independent execution and review option. It
is additive and does not depend on hook execution order.

| model | cost | intelligence | taste |
|---|---:|---:|---:|
| `gpt-5.6-terra` | 10 | 6 | 4 |
| `gpt-5.5` | 9 | 8 | 5 |
| `gpt-5.6-sol` | 9 | 8 | 5 |

The `gpt-5.6-sol` and `gpt-5.6-terra` scores are estimates, not measurements.
Adjust them when team experience provides better evidence.

## Selection rules

- Use `gpt-5.5` for bulk or mechanical work with a clear specification, such as
  implementation, data analysis, and migrations.
- Use Codex as an additional independent perspective for plan and implementation
  reviews when useful.
- OpenAI models are reached only through this plugin's Codex MCP tools and
  skills, never by a hand-written `codex exec` shell command.

## Operations

- `/codex:ask` or MCP tool `codex_investigate`: read-only investigation,
  planning, research, and analysis.
- `/codex:write` or MCP tool `codex_implement`: explicitly requested
  implementation and fixes with workspace-write access.
- `/codex:review` or MCP tool `codex_review`: native read-only review of
  uncommitted changes, a base branch, or a commit.
- `/codex:delegate` or the `codex-router` agent: classify a self-contained task
  and choose exactly one of the operations above.

The raw Codex CLI currently defaults to `gpt-5.5` with effort `low`. Only select
`gpt-5.6-sol` or `gpt-5.6-terra` after verifying that the installed Codex CLI
supports that model. Codex CLI 0.143.0 rejects `gpt-5.6-sol` as requiring a newer
version. Do not use effort `minimal` in the current setup because enabled tools
such as image generation and web search are incompatible with it.

## Delegation safety

- Default ambiguous requests to read-only investigation. Use workspace-write
  only when the user explicitly asks to implement, fix, edit, or otherwise
  change files.
- Preserve the user's task text when forwarding it. Model, effort, and review
  target flags are runtime controls rather than task text.
- Return Codex output without rewriting it when the user invoked a Codex skill
  specifically for an independent result.
- MCP permission prompts are part of the safety boundary. Never bypass them and
  never place `codex_implement` under a blanket allow rule.
- The MCP transport passes long prompts as structured JSON and Codex stdin. Do
  not create shell one-liners or temporary prompt files.
