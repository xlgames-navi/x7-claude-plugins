---
description: 원격 저장소에 적용되는 규칙에 따라 변경사항 커밋
---

Use the `commit` skill for the request accompanying this workflow invocation.
Follow its remote-host classification, applicable message and grouping rules,
and safety constraints. Treat any text following `/commit` as additional
instructions. Apply the X7 issue, numbering, Korean-body, and CodeGen rules only
when the primary remote host matches `*.xlgames.com` or `*.xlgames.corp`;
otherwise follow the repository's own commit conventions.
