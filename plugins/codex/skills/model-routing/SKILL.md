---
name: model-routing
description: Team policy for selecting Claude models and routing OpenAI work through the bundled Codex MCP tools
user-invocable: false
---

# Team model-routing policy

Rankings are defaults, not hard limits; higher scores are better. Cost reflects
the team's effective cost rather than public list price. Intelligence measures
how difficult a problem can be delegated unsupervised. Taste covers UI/UX, code
quality, API design, and copy.

| model | cost | intelligence | taste |
|---|---:|---:|---:|
| `gpt-5.6-terra` | 10 | 6 | 4 |
| `gpt-5.5` | 9 | 8 | 5 |
| `gpt-5.6-sol` | 9 | 8 | 5 |
| `sonnet-5` | 5 | 5 | 7 |
| `opus-4.8` | 4 | 7 | 8 |
| `fable-5` | 2 | 9 | 9 |

The `gpt-5.6-sol` and `gpt-5.6-terra` scores are estimates, not measurements.
Adjust them when team experience provides better evidence.

## Selection rules

- These are defaults, not limits. If a cheaper model's result does not meet the
  bar, rerun or redo the work with a stronger model without asking merely to
  escalate model quality. Judge the output, not the price tag.
- For anything that ships, resolve conflicts using intelligence, then taste,
  then cost.
- Use `gpt-5.5` for bulk or mechanical work with a clear specification, such as
  implementation, data analysis, and migrations.
- User-facing UI, copy, and API design require taste 7 or higher. Prefer
  `sonnet-5`, `opus-4.8`, or `fable-5` for that work.
- Review plans and implementations with `fable-5` or `opus-4.8` when available;
  use Codex as an additional independent perspective when useful.
- Never select Haiku.
- Claude models run through the Agent or Workflow model parameter. OpenAI models
  are reached only through this plugin's Codex MCP tools and skills, never by a
  hand-written `codex exec` shell command.

## Codex routing

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
