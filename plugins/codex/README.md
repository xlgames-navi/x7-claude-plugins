# Codex plugin

The plugin exposes three structured MCP tools backed by the local `codex` CLI:

| Tool | Codex command | Repository access |
|---|---|---|
| `codex_investigate` | `codex exec --ephemeral` | `read-only` |
| `codex_implement` | `codex exec --ephemeral` | `workspace-write` |
| `codex_review` | `codex review` | read-only review |

The accompanying skills are available as `/codex:ask`, `/codex:write`, and
`/codex:review`. `/codex:delegate` runs the plugin-provided `codex-router`
subagent, which selects one of those MCP operations from the user's request.

The `model-routing` skill is the single source of truth for team model-selection
guidance. A SessionStart hook injects that guidance into the main Claude context,
and the router agent preloads the same skill. Plugin-shipped agents cannot set
`permissionMode`, so the router relies on normal MCP permission prompts and
never bypasses them.

The server uses the project directory supplied by Claude Code, invokes Codex
without a shell, passes prompts through stdin, enforces validated model/effort
arguments, supports cancellation and timeouts, and truncates oversized output.
