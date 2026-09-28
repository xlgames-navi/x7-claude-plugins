---
name: model-routing
description: Shared team policy for selecting Claude models and routing work across workflows and subagents
user-invocable: false
---

# Team Claude model-routing policy

Rankings are defaults, not hard limits; higher scores are better. Cost reflects
the team's effective cost rather than public list price. Intelligence measures
how difficult a problem can be delegated unsupervised. Taste covers UI/UX, code
quality, API design, and copy.

| model       | cost | intelligence | taste |
| ----------- | ---: | -----------: | ----: |
| `sonnet-5`  |    5 |            5 |     7 |
| `opus-5.5`  |    4 |            7 |     8 |
| `fable-5.1` |    2 |            9 |     9 |

## Selection rules

- These are defaults, not limits. If a cheaper model's result does not meet the
  bar, rerun or redo the work with a stronger model without asking merely to
  escalate model quality. Judge the output, not the price tag.
- For anything that ships, resolve conflicts using intelligence, then taste,
  then cost.
- User-facing UI, copy, and API design require taste 7 or higher.
- Review plans and implementations with `fable-5.1` or `opus-5.5` when available.
- Never select Haiku.
- Claude models run through the Agent or Workflow model parameter.

This policy may be extended by other enabled plugins. Treat extension rules as
additional routing options; they do not replace these quality requirements.
