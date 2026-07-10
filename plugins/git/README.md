# Git plugin

The `git` plugin provides guarded Git maintenance workflows.

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
