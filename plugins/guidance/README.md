# Guidance plugin

The `guidance` plugin injects the X7 team's shared Claude model-selection and
workflow policy into every Claude Code session and subagent. It also includes
Codex routing guidance that applies only when the official OpenAI Codex plugin
is installed and enabled.

Install it directly when only the shared Claude guidance is needed:

```text
/plugin install guidance@x7
/reload-plugins
```

For Codex routing, install and enable `codex@openai-codex` from
[OpenAI's Codex plugin marketplace](https://github.com/openai/codex-plugin-cc).
The X7 guidance plugin does not install it as a dependency. Without that plugin,
the Codex routing extension is inactive.
