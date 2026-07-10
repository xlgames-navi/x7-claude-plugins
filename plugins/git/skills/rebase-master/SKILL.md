---
name: rebase-master
description: Rebase the current Git branch onto the local master branch, automatically analyze and resolve merge conflicts, stage resolutions, and continue the rebase until completion. Use only when explicitly invoked to update a feature branch from master; do nothing when the current branch is master.
argument-hint: "[optional conflict-resolution or validation instructions]"
disable-model-invocation: true
---

# Rebase the current branch onto master

Rebase the current branch onto the local `master` branch and resolve conflicts
autonomously when the intended result can be established from repository
evidence. Apply any additional instructions from:

$ARGUMENTS

## Workflow

1. Confirm the current directory is inside a Git worktree. Read the current
   branch with `git branch --show-current`.
2. If the branch is exactly `master`, report that no rebase is needed and stop
   immediately without changing files or Git state.
3. Stop and report without mutation if HEAD is detached, `master` does not exist
   as a local branch, another Git operation is active, or the worktree/index has
   pre-existing changes. Never stash or discard user changes automatically.
4. Inspect recent branch and `master` history, then run `git rebase master`.
5. If the rebase stops on conflicts:
   - Read `git status`, `git diff --name-only --diff-filter=U`, the current patch
     from `git rebase --show-current-patch`, and relevant surrounding code.
   - For content conflicts, inspect stage 1/2/3 with `git show :1:<path>`,
     `git show :2:<path>`, and `git show :3:<path>` when useful. During rebase,
     "ours" is the rebased `master` state and "theirs" is the replayed branch
     commit; never choose either side based only on those labels.
   - Resolve each file by preserving the compatible intent of both `master` and
     the replayed commit. Handle modify/delete, add/add, rename, and binary
     conflicts explicitly according to history and call sites.
   - Do not make unrelated cleanup or formatting changes.
   - If intent is genuinely ambiguous or a safe resolution requires a product
     decision, stop with the rebase in progress and explain the exact conflict
     instead of guessing.
6. Verify that no unmerged paths or conflict markers remain. Review the resolved
   diff, run `git diff --check`, and run a focused build or test when one is
   clearly available and proportionate for the affected code.
7. Stage only the files resolved for the current rebase step. Continue with
   `git -c core.editor=true rebase --continue` so an editor cannot block the
   workflow.
8. Repeat conflict analysis, resolution, verification, staging, and continuation
   until Git reports the rebase complete.
9. Confirm the final branch, clean worktree, recent history, and that no rebase
   state remains. Run the most relevant bounded validation if it was not already
   run, then summarize resolved conflicts and validation results.

## Safety constraints

- Rebase only onto the local branch named `master`. Do not fetch, pull, merge,
  push, or substitute `origin/master` unless the user separately requests it.
- Never run `git reset --hard`, `git checkout -- <path>`, `git restore` over
  user work, `git clean`, or automatic stash commands.
- Never use `git rebase --abort` or `git rebase --skip` without explicit user
  approval. If a commit becomes empty and Git requires `--skip`, stop and report
  why.
- Never force-push. Completing the local rebase is the end of this skill.
- Do not claim success while unresolved paths, conflict markers, a dirty
  worktree, or rebase metadata remain.
