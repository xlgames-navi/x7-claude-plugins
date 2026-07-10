# Codex plugin

The plugin extends the shared `guidance` plugin with three structured MCP tools
backed by the local `codex` CLI:

| Tool | Codex command | Repository access |
|---|---|---|
| `codex_investigate` | `codex exec --ephemeral` | `read-only` |
| `codex_implement` | `codex exec --ephemeral` | `workspace-write` |
| `codex_review` | `codex review` | read-only review |

The accompanying skills are available as `/codex:ask`, `/codex:write`, and
`/codex:review`. `/codex:delegate` runs the plugin-provided `codex-router`
subagent, which selects one of those MCP operations from the user's request.

Installing this plugin automatically installs `guidance` from the same
marketplace. The shared Claude policy remains owned by that plugin, while the
`codex-routing` skill and hooks add only Codex-specific model and execution
rules. Both extensions are injected into sessions and subagents without relying
on hook execution order.

Plugin-shipped agents cannot set `permissionMode`, so the router relies on
normal MCP permission prompts and never bypasses them. The server invokes Codex
without a shell, passes prompts through stdin, validates model and effort
arguments, supports cancellation and timeouts, and truncates oversized output.
