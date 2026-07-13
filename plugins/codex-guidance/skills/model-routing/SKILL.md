---
name: model-routing
description: Apply X7 team policy for selecting Codex models and reasoning effort. Use when planning, delegating, reviewing, or choosing a model for Codex work.
---

# X7 Codex model-routing policy

Use published API prices and evaluation results as routing evidence instead of
the subjective Claude policy scores. Higher one-digit scores are better. Cost
efficiency is normalized from relative input and output prices; intelligence
and coding are normalized from the published evaluation indices.

| model | cost efficiency | intelligence | coding |
|---|---:|---:|---:|
| `gpt-5.6-sol` | 1 | 9 | 9 |
| `gpt-5.6-terra` | 2 | 8 | 8 |
| `gpt-5.6-luna` | 5 | 7 | 7 |
| `gpt-5.5` | 1 | 8 | 8 |

The intelligence scores derive from Artificial Analysis Intelligence Index
v4.1 and the coding scores from Artificial Analysis Coding Agent Index v1.1 as
published in OpenAI's GPT-5.6 launch results on 2026-07-09. They are approximate
routing signals, not guarantees for every Codex task or reasoning-effort
setting. API prices may differ from subscription quota consumption.

## Selection rules

- Prefer `gpt-5.6-terra` as the default: its published coding score exceeds
  GPT-5.5 while its token prices are half as high.
- Prefer `gpt-5.6-luna` for cost-sensitive, high-volume work whose output can
  be validated cheaply. Its published coding score remains close to GPT-5.5 at
  one-fifth of the input and output price.
- Prefer `gpt-5.6-sol` for the hardest architecture, debugging, long-horizon
  implementation, and independent review tasks. It leads both published
  indices but costs the same per token as GPT-5.5.
- Retain `gpt-5.5` for compatibility or established task-specific behavior;
  do not choose it by default when the GPT-5.6 family is available.
- Use low reasoning effort for bounded mechanical tasks, medium or high for
  ambiguous implementation and debugging, and high or xhigh for difficult
  architecture, concurrency, or independent review.
- Verify that the installed Codex version and account expose a model before
  selecting it. Fall back to the best available model rather than failing the
  task solely because a preferred model is unavailable.
- Treat enabled tools and model/effort compatibility as runtime constraints.
- If the current Codex surface cannot change models during an active task,
  recommend the model for the next task or subagent. Never claim a model switch
  occurred unless the runtime confirms it.

## Sources

- OpenAI GPT-5.6 launch and evaluation tables:
  https://openai.com/index/gpt-5-6/
- OpenAI model catalog and current API prices:
  https://developers.openai.com/api/docs/models
