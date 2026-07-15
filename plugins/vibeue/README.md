# VibeUE plugin

The `vibeue` plugin connects to the [VibeUE](https://github.com/kevinpbuckley/VibeUE)
Unreal Engine MCP server so Claude Code, Codex, and Antigravity can inspect
UMG Widget Blueprints and manage MVVM bindings directly in a running Unreal
Editor. It expects VibeUE's MCP HTTP endpoint to already be listening at
`http://127.0.0.1:8088/mcp` (the plugin's default) and proxies to it with
`mcp-remote`.

## `/vibeue:umg-inspect-bind`

Resolves a Widget Blueprint name, inspects its UMG hierarchy and Blueprint
graph references, and applies MVVM bindings — or wires Blueprint EventGraph
nodes directly when MVVM binding alone is not enough.

```text
/vibeue:umg-inspect-bind Get full hierarchy of QuestViewBP and expand all BP references
/vibeue:umg-inspect-bind Add SetCommand binding on QuestViewBP for QuestPopupViewModel.Accept
```

## `/vibeue:umg-mvvm-binding`

Registers ViewModels and manages MVVM property bindings and MvvmButton
`SetCommand` command bindings, including custom-event destinations through
`MVVMEditorSubsystem`.

```text
/vibeue:umg-mvvm-binding Register GameHUDViewModel as HudVM and bind HealthPercent to HealthBar.Percent
```

## Prerequisites

- The target Unreal project has the VibeUE plugin installed and enabled, and
  the Unreal Editor is running and interactive.
- VibeUE's MCP server is reachable at `http://127.0.0.1:8088/mcp` by default.
  Set `VIBEUE_MCP_PORT` to point at a different port if the project's VibeUE
  proxy is configured differently; the launcher validates it is an integer in
  `1-65535` and falls back to `8088` when unset.
- `npx` is available locally to run the bundled `mcp-remote` proxy.

Both skills refuse to fall back to manual `.uasset` binary inspection when the
MCP tools are unavailable — they report the missing prerequisite instead.
