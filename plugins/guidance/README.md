# Guidance plugin

The `guidance` plugin injects the X7 team's shared Claude model-selection and
workflow policy into every Claude Code session and subagent.

Install it directly when only the shared Claude guidance is needed:

```text
/plugin install guidance@x7
/reload-plugins
```

Installing `codex@x7` also installs this plugin automatically as a dependency.
The guidance plugin contains no Codex-specific commands or execution rules.
