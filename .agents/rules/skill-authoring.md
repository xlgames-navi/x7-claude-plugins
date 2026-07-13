# Cross-host skill authoring

Read and follow the repository-root `AGENTS.md` before changing plugins or
skills. Package every supported skill for Claude Code, Codex, and Antigravity
unless the user explicitly limits the target hosts. Treat `plugins/` as the
canonical source and regenerate Antigravity packages with
`npm run sync:antigravity`; do not edit generated copies directly.
