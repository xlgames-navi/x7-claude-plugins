---
name: model-routing
description: Apply X7 team policy for selecting reasoning models in Google Antigravity. Use when planning, delegating, reviewing, or recommending a model for Antigravity work.
---

# X7 Antigravity model-routing policy

Rankings are defaults, not hard limits; higher scores are better. Cost reflects
the team's effective quota and latency cost rather than public list price.
Intelligence measures how difficult a problem can be completed unsupervised.
Taste covers UI/UX, code quality, API design, and copy.

| model | cost | intelligence | taste |
|---|---:|---:|---:|
| `gemini-3.5-flash` | 2 | 7 | 6 |
| `gemini-3.1-pro-low` | 4 | 8 | 7 |
| `gemini-3.1-pro-high` | 7 | 9 | 8 |
| `claude-sonnet-4.6-thinking` | 5 | 8 | 8 |
| `claude-opus-4.6-thinking` | 8 | 9 | 9 |
| `gpt-oss-120b` | 1 | 5 | 4 |

These scores are initial estimates. Adjust them when team experience provides
better evidence or Antigravity changes model availability.

## Selection rules

- Prefer `gemini-3.5-flash` for fast iteration, bounded implementation,
  repository exploration, and routine fixes.
- Prefer `gemini-3.1-pro-low` for general complex implementation and debugging;
  use `gemini-3.1-pro-high` for architecture, long-horizon work, and difficult
  reasoning where additional compute is justified.
- Prefer `claude-sonnet-4.6-thinking` for user-facing implementation and design
  work; use `claude-opus-4.6-thinking` for the highest-risk reviews and tasks
  where intelligence and taste both dominate cost.
- Use `gpt-oss-120b` only for low-cost, bounded work whose result can be checked
  cheaply. Escalate when its output misses the required bar.
- For anything that ships, resolve conflicts using intelligence, then taste,
  then cost. User-facing UI, copy, and API design require taste 7 or higher.
- Verify that the active account and Antigravity surface expose a model before
  recommending it. Model availability and quotas vary by plan.
- Antigravity's selected reasoning model is sticky within a conversation turn.
  If the agent cannot change it programmatically, recommend a selection for the
  next turn or conversation. Never claim a model switch occurred unless the UI
  or runtime confirms it.
