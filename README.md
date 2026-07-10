# X7 Claude plugins

This repository is the X7 team's Claude Code plugin marketplace. It currently
contains the `codex` plugin for delegating work to the locally installed OpenAI
Codex CLI and the `ripgrep` plugin for fast, safe repository search. Additional
X7 plugins can be added under `plugins/` without changing the marketplace
identity.

Repository:
[xlgames-navi/x7-claude-plugins](https://github.com/xlgames-navi/x7-claude-plugins)

The marketplace name is `x7`. Individual plugins retain their own identifiers
and command namespaces, such as `codex` and `/codex:*`.

## Plugins

### `codex`

- `/codex:ask` — read-only investigation, planning, and analysis.
- `/codex:write` — explicitly write-capable implementation work.
- `/codex:review` — native `codex review` for uncommitted, branch, or commit
  changes.
- `/codex:delegate` — run the plugin's `codex-router` agent, which chooses the
  appropriate Codex mode from the request.
- Team model-routing guidance injected at session start and after resume,
  `/clear`, or compaction.
- A dependency-free stdio MCP server. Prompts are passed as structured JSON and
  then streamed to Codex over stdin, so long prompts do not need shell quoting or
  temporary files.

### `ripgrep`

- `/ripgrep:search` — search file names and contents with `rg`, applying useful
  type/glob/context filters and returning concise `path:line` results.
- Respects `.gitignore`, hidden-file, and binary-file defaults unless the user
  explicitly asks to broaden the search.
- Blocks command-executing ripgrep options such as `--pre` and
  `--hostname-bin`, and does not grant blanket `Bash(rg *)` permission.

## Prerequisites

- Claude Code 2.1.128 or newer.
- ripgrep on `PATH` for the `ripgrep` plugin (`rg --version` to verify).

The `codex` plugin additionally requires:

- Node.js 18 or newer.
- A `codex` executable on `PATH`, authenticated with `codex login`.
- Access to the configured Codex model. The plugin defaults to `gpt-5.5` with
  reasoning effort `low` because those values work with Codex CLI 0.143.0.

Optional environment variables:

- `CODEX_CLI_PATH` — absolute path to the Codex executable.
- `CODEX_TEAM_MODEL` — default model; defaults to `gpt-5.5`.
- `CODEX_TEAM_EFFORT` — `low`, `medium`, `high`, or `xhigh`; defaults to `low`.
- `CODEX_MCP_TIMEOUT_SECONDS` — default execution timeout; defaults to 1800.
- `CODEX_MCP_DEBUG=1` — enable MCP server diagnostics on stderr.

## Installation

From Claude Code:

```text
/plugin marketplace add xlgames-navi/x7-claude-plugins
/plugin install codex@x7
/plugin install ripgrep@x7
/reload-plugins
```

Verify that the MCP server is connected with `/mcp`, then invoke one of the
skills:

```text
/codex:ask --effort high investigate the allocator configuration
/codex:write implement the approved fix and run focused tests
/codex:review --base main focus on correctness and concurrency
/codex:delegate investigate the build and propose the safest fix
/ripgrep:search find all references to a symbol in the source code
```

MCP tools require permission on first use. The read-only tools advertise MCP
read-only annotations, while the write tool is deliberately marked as
write-capable. Do not add the write tool to a blanket allow rule.

## Local development

Clone the repository:

```powershell
git clone https://github.com/xlgames-navi/x7-claude-plugins.git
cd x7-claude-plugins
claude --plugin-dir .\plugins\codex
claude --plugin-dir .\plugins\ripgrep
```

On macOS or Linux, use:

```bash
claude --plugin-dir ./plugins/codex
claude --plugin-dir ./plugins/ripgrep
```

## Team distribution

Team members can add `xlgames-navi/x7-claude-plugins` as a marketplace and
install `codex@x7`, `ripgrep@x7`, or both using the installation commands above.
For repository-guided installation, add the marketplace and enabled plugin to
the consuming repository's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "x7": {
      "source": {
        "source": "github",
        "repo": "xlgames-navi/x7-claude-plugins"
      }
    }
  },
  "enabledPlugins": {
    "codex@x7": true,
    "ripgrep@x7": true
  }
}
```

## Development

```powershell
npm test
npm run smoke
claude plugin validate .
```

The smoke test makes one real read-only Codex request. The plugins have no npm
runtime dependencies.
