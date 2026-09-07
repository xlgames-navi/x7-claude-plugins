# GPT-6 Astra Advisor boundary

The `advisor` skill is available only to the primary/root task agent. When the
current run is a subagent, worker, delegated task, or child agent, it must never
initiate or proxy `$advisor`, request a new GPT-6 Astra Advisor opinion, call
`multi_agent_v1__spawn_agent` for that consultation, or spawn another agent to
obtain it. A worker explicitly assigned by the root to be the GPT-6 Astra
Advisor may answer that direct read-only prompt, but it must not recurse. Other
subagents continue the assigned work using any advice already supplied by the
root agent; if none exists, proceed without a consultation. When the role is
ambiguous, skip the consultation.

The Antigravity package has no Astra adapter. Do not claim that a consultation
occurred there or silently replace it with another model.
