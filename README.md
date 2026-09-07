# X7 Claude and Codex plugins

This repository is the X7 team's Claude Code and Codex plugin marketplace. It contains
independently installable plugins for shared Claude guidance, local OpenAI Codex
delegation, safe repository search, X7-formatted commits, guarded Git
maintenance, private
intranet access, and VibeUE Unreal Engine MCP workflows. Additional X7 plugins
can be added under `plugins/` without changing the marketplace identity.

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

### `advisor`

- Consults GPT-6 Astra for one read-only second opinion before consequential
  complex work or when the user explicitly requests Advisor help.
- The consultation is root-agent-only. Subagents and the Advisor worker cannot
  invoke or proxy another Advisor consultation.
- Codex uses its native Astra subagent adapter; Claude Code uses the read-only
  `codex_investigate` adapter from the `codex` plugin.
- Antigravity publishes the skill and workflow but reports that no Astra
  adapter is available there rather than silently substituting another model.

### `ripgrep`

- `/ripgrep:search` — search file names and contents with `rg`, applying useful
  type/glob/context filters and returning concise `path:line` results.
- Respects `.gitignore`, hidden-file, and binary-file defaults unless the user
  explicitly asks to broaden the search.
- Blocks command-executing ripgrep options such as `--pre` and
  `--hostname-bin`, and does not grant blanket `Bash(rg *)` permission.

### `git`

- `/git:commit` — commit requested changes with the X7 GitLab issue message
  format only when the primary remote host matches `*.xlgames.com` or
  `*.xlgames.corp`; other repositories follow their own commit conventions. On
  X7 GitLab, derive the issue ID from a leading numeric branch prefix, ask
  whether to start programmer commit numbering at 1 when needed, and commit all
  `Generated` changes together last as `CodeGen`.
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
- Uses the supported system default browser with a dedicated persistent profile
  for pages that require interactive authentication. Chrome, Edge, and Whale
  are supported; sign in there once and retry.
- Keeps credentials and cookies inside that browser profile, validates the final
  page URL, limits returned text, and uses a guarded curl wrapper only as a
  fallback for unauthenticated pages.

### `vibeue`

- `/vibeue:umg-inspect-bind` — resolve a Widget Blueprint name, inspect its UMG
  hierarchy and Blueprint graph references, and apply MVVM bindings, or wire
  Blueprint EventGraph nodes directly when MVVM binding alone is insufficient.
- `/vibeue:umg-mvvm-binding` — register MVVM ViewModels and manage property
  bindings and MvvmButton `SetCommand` command bindings.
- Connects to the [VibeUE](https://github.com/kevinpbuckley/VibeUE) MCP server
  running inside a local Unreal Editor (`http://127.0.0.1:8088/mcp` by
  default) through `mcp-remote`. Refuses to fall back to manual `.uasset`
  binary inspection when the MCP tools are unavailable.

## Prerequisites

- Claude Code 2.1.128 or newer.
- Git on `PATH` for the `git` plugin.
- Chrome, Edge, or Whale for authenticated `internal-web` pages. Override the
  automatic default-browser choice with `X7_INTERNAL_BROWSER`, or use
  `X7_INTERNAL_BROWSER_PATH` for a custom executable location.
- curl on `PATH` for the unauthenticated `internal-web` fallback (`curl.exe` on
  Windows).
- ripgrep on `PATH` for the `ripgrep` plugin (`rg --version` to verify).
- `npx` on `PATH` and a running Unreal Editor with the VibeUE plugin loaded
  for the `vibeue` plugin. Its MCP server defaults to port `8088`; override
  with `VIBEUE_MCP_PORT` if the project's VibeUE proxy uses a different port.

The `codex` plugin additionally requires:

- Node.js 18 or newer.
- A `codex` executable on `PATH`, authenticated with `codex login`.
- Access to the configured Codex model. The plugin defaults to `gpt-5.5` with
  reasoning effort `low` because those values work with Codex CLI 0.143.0.
- The `advisor` plugin additionally needs a Codex runtime that exposes
  `gpt-6-astra`; if it is unavailable, the task continues without an Astra
  consultation.

Optional environment variables:

- `CODEX_CLI_PATH` — absolute path to the Codex executable.
- `CODEX_TEAM_MODEL` — default model; defaults to `gpt-5.5`.
- `CODEX_TEAM_EFFORT` — `low`, `medium`, `high`, or `xhigh`; defaults to `low`.
- `CODEX_MCP_TIMEOUT_SECONDS` — default execution timeout; defaults to 1800.
- `CODEX_MCP_DEBUG=1` — enable MCP server diagnostics on stderr.

## Installation

### Claude Code

Run the following commands in Claude Code:

```text
/plugin marketplace add xlgames-navi/x7-claude-plugins
/plugin install guidance@x7
/plugin install codex@x7
/plugin install advisor@x7
/plugin install ripgrep@x7
/plugin install git@x7
/plugin install internal-web@x7
/plugin install vibeue@x7
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
/advisor:advisor review this multi-file refactor before I start
/ripgrep:search find all references to a symbol in the source code
/git:commit 12345번 이슈, 프로그래머 커밋 번호 2
/git:rebase-master
/internal-web:read https://x7jenkins.xlgames.com/job/example/api/json summarize the build status
/vibeue:umg-inspect-bind Get full hierarchy of QuestViewBP and expand all BP references
/vibeue:umg-mvvm-binding Register GameHUDViewModel as HudVM and bind HealthPercent to HealthBar.Percent
```

Verify that the Codex MCP server is connected with `/mcp` before using Codex
skills. MCP tools require permission on first use. The read-only tools advertise
MCP read-only annotations, while the write tool is deliberately marked as
write-capable. Do not add the write tool to a blanket allow rule.

### Codex

The `advisor`, `ripgrep`, `git`, `internal-web`, and `vibeue` plugins are also packaged
for Codex. The Claude `guidance` and `codex` plugins are intentionally omitted
from the Codex marketplace because their hooks and Codex-delegation server are
Claude-specific and redundant inside Codex itself.

Install the marketplace and plugins from a terminal with a Codex CLI version
that supports the `codex plugin` commands:

```powershell
codex plugin marketplace add xlgames-navi/x7-claude-plugins
codex plugin add codex-guidance@x7
codex plugin add advisor@x7
codex plugin add ripgrep@x7
codex plugin add git@x7
codex plugin add internal-web@x7
codex plugin add vibeue@x7
codex plugin list
```

Restart Codex after installation so the newly installed skills are loaded.
Invoke the installed Codex skills as `$model-routing`, `$advisor`, `$search`,
`$commit`, `$rebase-master`, `$read`, `$umg-inspect-bind`, and
`$umg-mvvm-binding`. Use `$advisor` when an explicit Astra review is needed.
The Codex guidance plugin contains only the X7 Codex model table; it does not
load Claude or Antigravity model rankings.

### Antigravity

Antigravity plugins in this repository are installed at workspace scope. Clone
the repository, then open its root directory as the workspace in Antigravity:

```powershell
git clone https://github.com/xlgames-navi/x7-claude-plugins.git
cd x7-claude-plugins
```

Antigravity discovers the generated packages from `.agents/plugins/` and the
workspace marketplace at `.agents/plugins/marketplace.json`. Restart or reload
the Antigravity workspace if it was already open when the repository was
cloned. The `antigravity-guidance` plugin supplies an Antigravity-specific
`model-routing` table. The `advisor` skill is packaged for workflow discovery
but reports that no Astra adapter is available on this host, while `ripgrep`,
`git`, `internal-web`, and `vibeue`
expose the same shared skills as Claude Code and Codex.

Use `/skills` in Antigravity CLI to confirm that the skills are loaded. In
Antigravity GUI, confirm that `/model-routing`, `/advisor`, `/search`, `/commit`,
`/rebase-master`, `/read`, `/umg-inspect-bind`, and `/umg-mvvm-binding` appear
in slash completion. These workspace Workflow wrappers select the
corresponding canonical skills and preserve their safety constraints.

The canonical sources remain under `plugins/`. After editing a shared skill or
resource, regenerate and verify the Antigravity packages:

```powershell
npm run sync:antigravity
npm run validate:antigravity
```

## Updating plugins

### Claude Code

Refresh the marketplace, then update each installed plugin. Omit plugins that
are not installed:

```powershell
claude plugin marketplace update x7
claude plugin update guidance@x7
claude plugin update codex@x7
claude plugin update advisor@x7
claude plugin update ripgrep@x7
claude plugin update git@x7
claude plugin update internal-web@x7
claude plugin update vibeue@x7
```

Restart Claude Code after the updates are complete. Updating `codex@x7` does
not remove the need to update its installed `guidance@x7` dependency when both
plugins have new releases.

### Codex

Refresh the Git marketplace snapshot. Installed X7 plugins refer to that
snapshot, so a separate install command is not required:

```powershell
codex plugin marketplace upgrade x7
codex plugin list
```

Restart Codex after the marketplace upgrade so the refreshed skills are
loaded. If a new X7 plugin was added to the marketplace, install it separately
with `codex plugin add <plugin>@x7`.

### Antigravity

Update the cloned workspace repository, then reload the workspace:

```powershell
git pull --ff-only
```

Antigravity reloads the updated packages from `.agents/plugins/` and Workflow
wrappers from `.agent/workflows/`. Use `/skills` in Antigravity CLI or slash
completion in Antigravity GUI to confirm that the updated skills are loaded.

## Local development

Clone the repository:

```powershell
git clone https://github.com/xlgames-navi/x7-claude-plugins.git
cd x7-claude-plugins
claude --plugin-dir .\plugins\guidance
claude --plugin-dir .\plugins\codex
claude --plugin-dir .\plugins\advisor
claude --plugin-dir .\plugins\ripgrep
claude --plugin-dir .\plugins\git
claude --plugin-dir .\plugins\internal-web
claude --plugin-dir .\plugins\vibeue
```

On macOS or Linux, use:

```bash
claude --plugin-dir ./plugins/guidance
claude --plugin-dir ./plugins/codex
claude --plugin-dir ./plugins/advisor
claude --plugin-dir ./plugins/ripgrep
claude --plugin-dir ./plugins/git
claude --plugin-dir ./plugins/internal-web
claude --plugin-dir ./plugins/vibeue
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
    "advisor@x7": true,
    "ripgrep@x7": true,
    "git@x7": true,
    "internal-web@x7": true,
    "vibeue@x7": true
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
