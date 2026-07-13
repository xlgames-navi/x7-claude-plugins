# Git plugin

The `git` plugin provides guarded commit and maintenance workflows.

## `/git:commit`

Commit requested changes according to the primary remote host. Repositories
under `*.xlgames.com` or `*.xlgames.corp` use an
`x7/x7#<issue> [(<number>)] <title>` subject and a Korean Markdown-list body. The
issue ID is the leading digit sequence from a branch
matching `^(\d+)(?:-|$)`; for example, `1234-`, `1234`, and `1234-1` all map to
issue `1234`. Other branch formats cause the workflow to ask for the issue ID.
When the current author has no prior commit for the issue, the workflow asks
whether to number commits; numbering starts at 1 when enabled and the
parenthesized segment is omitted when disabled. Changes below case-insensitive
`Generated` directories are excluded from earlier commits and committed
together last with the title `CodeGen`.

Repositories whose primary remote does not match either wildcard skip all of
those X7 rules and follow their own commit history and repository guidance. The
workflow never pushes.

```text
/git:commit 12345번 이슈, 프로그래머 커밋 번호 2
/git:commit x7/x7#12345 (3) 로그인 오류 처리 개선
/git:commit 12345번 이슈, 커밋 번호는 사용하지 않음
```

## `/git:rebase-master`

Rebase the current feature branch onto the local `master` branch, analyze and
resolve conflicts, validate each resolution, and continue until the rebase is
complete.

The command exits without changing anything when the current branch is
`master`. It also refuses to overwrite a dirty worktree, stash changes, skip
commits, abort the rebase, fetch, push, or force-push automatically.

```text
/git:rebase-master
/git:rebase-master preserve the feature branch's public API behavior
```
