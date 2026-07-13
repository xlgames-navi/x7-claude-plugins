# X7 Claude and Codex plugins

This repository is the X7 team's Claude Code and Codex plugin marketplace. It contains
independently installable plugins for shared Claude guidance, local OpenAI Codex
delegation, safe repository search, guarded Git maintenance, and private
intranet access. Additional X7 plugins can be added under `plugins/` without
changing the marketplace identity.

Repository:
[xlgames-navi/x7-claude-plugins](https://github.com/xlgames-navi/x7-claude-plugins)

The marketplace name is `x7`. Individual plugins retain their own identifiers
and command namespaces, such as `guidance`, `codex`, `/codex:*`, and `/git:*`.

## Plugins

### `guidance`

- Injects shared Claude model-selection and workflow guidance at session start,
  resume, `/clear`, compaction, and subagent start.
- Contains no Codex-specific commands or execution rules.
- Can be installed independently and is installed automatically by `codex`.

### `codex`

- Depends on `guidance` and adds only Codex-specific routing and safety rules.
- `/codex:ask` — read-only investigation, planning, and analysis.
- `/codex:write` — explicitly write-capable implementation work.
- `/codex:review` — native `codex review` for uncommitted, branch, or commit
  changes.
- `/codex:delegate` — run the plugin's `codex-router` agent, which chooses the
  appropriate Codex mode from the request.
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

### `git`

- `/git:rebase-master` — rebase the current branch onto local `master`, resolve
  conflicts from repository evidence, validate the result, and continue until
  complete.
- Does nothing when invoked from `master`.
- Refuses to discard or stash existing changes and never fetches, pushes,
  force-pushes, skips commits, or aborts the rebase automatically.

### `internal-web`

- `/internal-web:read` — read pages and API responses from HTTP(S) subdomains
  under `xlgames.com` or `xlgames.corp` using the developer's local network
  access.
- Uses a bundled domain-restricted curl wrapper instead of external web services.
- Restricts requests to GET, validates redirects, preserves TLS verification,
  limits response size and duration, and avoids persisting cookies or content.

## Prerequisites

- Claude Code 2.1.128 or newer.
- Git on `PATH` for the `git` plugin.
- curl on `PATH` for the `internal-web` plugin (`curl.exe` on Windows).
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
/plugin install guidance@x7
/plugin install codex@x7
/plugin install ripgrep@x7
/plugin install git@x7
/plugin install internal-web@x7
/reload-plugins
```

Install `guidance@x7` directly when only the shared Claude policy is needed.
Installing `codex@x7` automatically installs `guidance`, so the explicit
guidance installation command can be omitted in that case.

Invoke the installed skills as follows:

```text
/codex:ask --effort high investigate the allocator configuration
/codex:write implement the approved fix and run focused tests
/codex:review --base main focus on correctness and concurrency
/codex:delegate investigate the build and propose the safest fix
/ripgrep:search find all references to a symbol in the source code
/git:rebase-master
/internal-web:read https://x7jenkins.xlgames.com/job/example/api/json summarize the build status
```

Verify that the Codex MCP server is connected with `/mcp` before using Codex
skills. MCP tools require permission on first use. The read-only tools advertise
MCP read-only annotations, while the write tool is deliberately marked as
write-capable. Do not add the write tool to a blanket allow rule.

### Codex-native plugins

The `ripgrep`, `git`, and `internal-web` plugins are also packaged for Codex.
The Claude `guidance` and `codex` plugins are intentionally omitted from the
Codex marketplace because their hooks and Codex-delegation server are
Claude-specific and redundant inside Codex itself.

```powershell
codex plugin marketplace add xlgames-navi/x7-claude-plugins
codex plugin install codex-guidance@x7
codex plugin install ripgrep@x7
codex plugin install git@x7
codex plugin install internal-web@x7
```

Invoke the installed Codex skills as `$model-routing`, `$search`,
`$rebase-master`, and `$read`. The Codex guidance plugin contains only the X7
Codex model table; it does not load Claude or Antigravity model rankings.

### Antigravity

Antigravity discovers the generated workspace plugins under `.agents/plugins/`
when this repository is opened as a workspace. The `antigravity-guidance`
plugin supplies an Antigravity-specific `model-routing` table, while `ripgrep`,
`git`, and `internal-web` expose the same shared skills as Claude Code and Codex.
Use `/skills` in Antigravity CLI to inspect the loaded skills. In Antigravity
GUI, the workspace Workflow wrappers expose `/model-routing`, `/search`,
`/rebase-master`, and `/read` in slash completion; each wrapper selects the
corresponding skill and preserves its safety constraints.

The canonical sources remain under `plugins/`. After editing a shared skill or
resource, regenerate and verify the Antigravity packages:

```powershell
npm run sync:antigravity
npm run validate:antigravity
```

## Local development

Clone the repository:

```powershell
git clone https://github.com/xlgames-navi/x7-claude-plugins.git
cd x7-claude-plugins
claude --plugin-dir .\plugins\guidance
claude --plugin-dir .\plugins\codex
claude --plugin-dir .\plugins\ripgrep
claude --plugin-dir .\plugins\git
claude --plugin-dir .\plugins\internal-web
```

On macOS or Linux, use:

```bash
claude --plugin-dir ./plugins/guidance
claude --plugin-dir ./plugins/codex
claude --plugin-dir ./plugins/ripgrep
claude --plugin-dir ./plugins/git
claude --plugin-dir ./plugins/internal-web
```

## Team distribution

Team members can add `xlgames-navi/x7-claude-plugins` as a marketplace and
install any plugin using the commands above. For repository-guided installation,
add the marketplace and desired plugins to the consuming repository's
`.claude/settings.json`:

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
    "ripgrep@x7": true,
    "git@x7": true,
    "internal-web@x7": true
  }
}
```

Enabling `codex@x7` resolves `guidance` through the plugin dependency. To use
only the shared policy, enable `guidance@x7` instead.

## Development

```powershell
npm test
npm run smoke
npm run validate:antigravity
npm run validate:codex
claude plugin validate .
```

The smoke test makes one real read-only Codex request. The plugins have no npm
runtime dependencies.
