# Repository agent instructions

These instructions apply to every AI coding agent working in this repository,
including Claude Code, Codex, Antigravity, Gemini, and similar tools.

## Adding or updating a skill

When asked to add or update a skill, support both Claude Code and Codex unless
the user explicitly limits the request to one host.

1. Put shared implementation in `plugins/<plugin>/skills/<skill>/`. Keep one
   canonical `SKILL.md` and one set of `scripts/`, `references/`, and `assets/`;
   do not fork the skill body by host.
2. Keep `SKILL.md` portable:
   - Use YAML frontmatter containing only `name` and `description`.
   - Make `description` state what the skill does and when it should trigger.
   - Refer to the user's request directly. Do not use Claude-only placeholders
     such as `$ARGUMENTS` or `${CLAUDE_PLUGIN_ROOT}`.
   - Resolve bundled files relative to the loaded skill or plugin directory.
     Do not assume a host-specific environment variable exists.
3. Add Codex metadata at `skills/<skill>/agents/openai.yaml`. Include quoted
   `interface.display_name`, `interface.short_description`, and a concise
   `interface.default_prompt` that explicitly names `$<skill-name>`. Set
   `policy.allow_implicit_invocation: false` for destructive or explicitly
   invoked workflows.
4. Ensure the containing plugin has both manifests:
   - Claude Code: `plugins/<plugin>/.claude-plugin/plugin.json`
   - Codex: `plugins/<plugin>/.codex-plugin/plugin.json`
   The Codex manifest must declare `skills: "./skills/"` and valid interface
   metadata. Keep names and versions aligned between manifests.
5. Register a new plugin in both marketplaces:
   - Claude Code: `.claude-plugin/marketplace.json`
   - Codex: `.agents/plugins/marketplace.json`
   Use marketplace name `x7` and source `./plugins/<plugin>`. Codex entries must
   include `policy.installation`, `policy.authentication`, and `category`.
   A skill added to an already registered plugin needs no marketplace entry.
6. Keep host-only capabilities isolated. Claude hooks, agents, commands, or MCP
   configuration may remain host-specific, but the shared skill must still work
   in Codex. If a capability cannot work safely in one host, document and test
   the exclusion instead of silently publishing a broken entry.
7. Update README plugin and invocation lists when user-facing behavior changes.

## Validation

Before finishing a skill change:

1. Add or update tests that verify both marketplace registrations, both plugin
   manifests, portable skill frontmatter, Codex metadata, and safety rules.
2. Run `npm test` and `npm run validate:codex`.
3. Run `git diff --check`.
4. If the relevant host validator is installed, also run
   `claude plugin validate .` and the Codex plugin/skill validators. Report a
   missing validator or dependency; do not claim it passed.

Do not commit or push unless the user explicitly requests it.
