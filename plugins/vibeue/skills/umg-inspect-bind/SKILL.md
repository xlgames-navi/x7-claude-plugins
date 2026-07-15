---
name: umg-inspect-bind
description: Resolve a Widget Blueprint name, inspect its UMG hierarchy and Blueprint graph references, and apply MVVM bindings through the VibeUE Unreal Engine MCP server. Use for combined hierarchy-inspection and binding requests, or for direct Blueprint EventGraph node wiring when MVVM binding is insufficient.
---

# UMG Inspect and Bind Orchestrator

> Use this skill when a request combines hierarchy inspection, Blueprint reference
> expansion, and MVVM binding application against a Widget Blueprint through the
> VibeUE MCP server.

## Step 0 — Activate VibeUE MCP Tools (mandatory first)

1. Confirm a VibeUE MCP tool (for example `manage_asset`) is visible. If it is
   not, load it through this host's MCP/tool discovery mechanism before
   anything else — for a Codex-style deferred tool list, search for it
   explicitly (e.g. `tool_search(query="vibeue manage_asset")`).
2. Confirm an Unreal Editor instance with VibeUE loaded is running and
   reachable at the configured MCP endpoint. If the editor is not running or
   the VibeUE tools are unavailable, report that prerequisite to the user and
   stop.
3. Do NOT parse `.uasset` binary files with file search, grep, Python, or
   manual binary inspection, even when MCP tools appear unavailable.

## Supported Request Shapes

- "Get full hierarchy of QuestViewBP and expand all BP references"
- "Add SetCommand binding on QuestViewBP for QuestPopupViewModel.Accept"
- "Inspect and apply missing bindings from the attached spec"

## Intent Router

### A) InspectGraph (read-only)

1. Resolve the Widget Blueprint path from name-only input (see `manage_asset`
   search in `umg-mvvm-binding` "Critical Rules #1").
2. Collect the hierarchy with `get_widget_snapshot(path)`.
3. Expand Blueprint references only when the request explicitly asks for
   dependency/referencer expansion, using:
   - `AssetDiscoveryService.get_asset_dependencies(path)`
   - `AssetDiscoveryService.get_asset_referencers(path)`
4. Return hierarchy plus optional graph report with truncation metadata.

### B) ApplyBinding (mutation)

1. Single-call preflight: resolve path, snapshot, ViewModel list, binding list.
2. Run InspectGraph only when explicitly requested.
3. Build the binding plan from the user's text.
4. Register the ViewModel if missing.
5. Upsert only missing MVVM property bindings and MvvmButton `SetCommand`
   command bindings.
6. Verify: re-read ViewModels and bindings, compile the Blueprint, and report
   the result. Tell the user to save in the editor if persistence is needed —
   avoid programmatic save. Do not run UBT as routine finalization; run it
   only for in-scope C++ changes or an explicit user request, and announce it
   first.

Autonomous apply rules:

- Treat "handle it", "if needed", "decide and apply", or equivalent delegation
  phrasing in any language as limited autonomous delegation, not permission to
  guess or bypass safety guards.
- Continue only when the Blueprint path, widget target, ViewModel alias, and
  binding-specific members are unambiguous.
  - Property bindings: source property, destination widget property, binding
    mode.
  - MvvmButton `SetCommand` bindings: target MvvmButton, ViewModel command
    getter/member.
- If multiple plausible targets exist, ask once and leave ambiguous mutations
  unapplied.
- For binding-only mutation requests, skip dependency/referencer expansion.

### C) SpecDrivenAutopatch (semi-autonomous)

Trigger when the user provides a binding spec and asks the agent to infer and
apply missing work.

1. "Autonomous" means a deterministic workflow without guesswork.
2. Resolve name-only Blueprints through asset search; use the result
   automatically only when there is exactly one `WidgetBlueprint` candidate.
3. If path, widget target, ViewModel alias, property member, command member,
   or binding mode is ambiguous, ask once and continue only the unambiguous
   read-only or mutation-safe portions.
4. Apply minimal changes: only missing ViewModel aliases and missing MVVM
   bindings.
5. Treat MvvmButton `SetCommand` as an MVVM command binding, not as a
   OneWay/TwoWay property binding or Blueprint EventGraph node work.
6. Do not create Blueprint graph nodes, custom events, or workaround chains
   unless the user explicitly asks for node-level work. If `SetCommand` cannot
   be applied as an MVVM command binding, report the prerequisite instead of
   creating EventGraph wiring.
7. If a Custom Event binding requires a missing or mismatched parameter pin,
   stop that binding and report the UI/BP-editor prerequisite.

### D) NodeGraphWiring (direct Blueprint node chain editing)

Use when MVVM binding is insufficient and direct node chain connections are
needed: button event → ViewModel function fallback explicitly requested by the
user, Event Construct → delegate bind → custom event, or branch node insertion
into existing chains.

Collect all state in one MCP call before any mutation:

```python
import unreal

bp_path = "/Game/UI/WBP_HUD"
graph   = "EventGraph"

nodes    = unreal.BlueprintService.get_nodes_in_graph(bp_path, graph)
conns    = unreal.BlueprintService.get_connections(bp_path, graph)
node_map = {n.node_id: n for n in nodes}      # full ID keys only
conn_from = {}
for c in conns:
    conn_from.setdefault(c.source_node_id, []).append(c)

custom_events = {n.node_title.split('\n')[0].strip(): n.node_id
                 for n in nodes if n.node_type == "K2Node_CustomEvent"}
ec_node = next((n for n in nodes if n.node_type == "K2Node_Event" and "Construct" in n.node_title), None)
print("custom_events:", custom_events)
# All subsequent node lookups stay in Python — no extra MCP calls.
```

Node connection API:

- `connect_nodes(bp, graph, src_id, src_pin, tgt_id, tgt_pin)`
- `disconnect_pin(bp, graph, node_id, pin_name)` — cut existing connection
- `set_node_pin_value(bp, graph, node_id, pin_name, value)` — set literal default

Node creation API:

- `add_branch_node(bp, graph, x, y)`
- `add_get_variable_node(bp, graph, var_name, x, y)`
- `add_set_variable_node(bp, graph, var_name, x, y)`
- `add_member_get_node(bp, graph, class_name, member_name, x, y)`
- `add_function_call_node(bp, graph, class_name, function_name, x, y)` — returns
  empty string if the Action DB is not yet updated (editor restart needed)
- `add_delegate_bind_node(bp, graph, class_name, delegate_name, x, y)`
- `add_create_delegate_node(bp, graph, function_name, x, y)`

`get_graph_definition` — read custom event actual function names:

```python
gd = unreal.BlueprintService.get_graph_definition(bp_path, "EventGraph")
nodes_desc = gd[0]  # Array[GraphNodeDesc]
for item in nodes_desc:
    if item.type == 'custom_event':
        print(item.ref, item.params['name'])  # params is a Map, use ['key']
```

## Hang-Safety Guards

1. For binding-only requests, skip dependency/referencer expansion.
2. Never retry the same expansion call more than once.
3. Avoid routine programmatic save — `save_asset` can trigger an editor save
   popup, making MCP wait or time out (`-32000`). Tell the user to save in the
   editor if persistence is needed.
4. Do not run UBT as routine finalization. Run it only for in-scope C++
   source/header changes or an explicit user request, and announce it first
   because it may take time.
5. `get_node_pins()` and `get_node_details()` return empty for Widget
   Blueprints — use `node.pins` and `get_connections()` instead.

## Operational Limits

- Graph expansion: depth 1, max 80 nodes.
- Escalate to depth 2 (max 200) only for explicit full-graph requests.
- Mark output as truncated when limits are reached.

## UE Python Compatibility Guards

- Use `AssetData.asset_class_path.asset_name` (NOT deprecated `asset_class`).
- Use `package_name` / `package_path` for paths (NOT `object_path`).
- Never read C++ properties off raw `unreal.WidgetBlueprint` objects — always
  use `WidgetService`.

## WidgetInfo Fields (`get_hierarchy` result)

| Field | Type | Notes |
|---|---|---|
| `widget_name` | str | component name |
| `widget_class` | str | e.g. `CanvasPanel`, `TextBlock` |
| `parent_widget` | str | empty for root |
| `is_root_widget` | bool | |
| `is_variable` | bool | exposed as BP variable |
| `children` | list[str] | child widget names |

No `depth` field — compute manually by walking `children` from the
`is_root_widget=True` node.

## WidgetViewModelInfo Fields (`list_view_models` result)

| Field | Notes |
|---|---|
| `view_model_name` | registered alias |
| `view_model_class_name` | NOT `view_model_class` |
| `creation_type` | `Manual`, `CreateInstance`, `Resolver`, etc. |

## WidgetViewModelBindingInfo Fields (`list_view_model_bindings` result)

| Field | Notes |
|---|---|
| `binding_index` | use for removal |
| `source_path` | VM property path |
| `destination_path` | widget property path |
| `binding_mode` | `OneWayToDestination`, `TwoWay`, etc. |

## Required Verification

After mutation: compile the Blueprint and report the result. Tell the user to
save in the editor if persistence is needed. Do not run UBT as routine
finalization; run it only for in-scope C++ changes or an explicit user
request, and announce it first. See `umg-mvvm-binding` "After mutation" for
detail.

## Companion References

- MVVM execution detail and full API reference: `../umg-mvvm-binding/SKILL.md`
- Known failure patterns and exact field names: `../../references/vibeue-mcp-pitfalls.md`
- Operational contracts (path resolution, verification, autonomy rules): `../../references/tool-contracts.md`
- Runtime failure diagnosis: `../../references/troubleshooting.md`
- Prompt examples and regression checks: `../../references/maintenance-examples.md`
- If the target project vendors the VibeUE Unreal plugin, it may also bundle
  its own skill docs (for example under a plugin content/skills path); query
  `manage_skills(action="suggest", query="...")` if that MCP method is
  available and this skill's guidance is insufficient.
