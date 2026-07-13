---
name: commit
description: Create one or more local Git commits for the requested changes. For repositories whose primary remote host is a subdomain of xlgames.com or xlgames.corp, apply the X7 GitLab issue format, optional programmer commit numbering, Korean Markdown-list summaries, and a final separate CodeGen commit for Generated directories; for other repositories, follow their own commit conventions. Use only when explicitly invoked to commit changes; never push.
---

# Commit changes safely

Commit only the changes covered by the user's request. Apply any additional
instructions accompanying the invocation without weakening these rules.

## Classify the repository

1. Inspect the current branch and its upstream remote. Use that remote as the
   primary remote. If no upstream is configured, use `origin`; if `origin` does
   not exist and exactly one remote exists, use that remote.
2. Parse the remote URL and normalize its hostname. Treat the repository as X7
   GitLab-managed only when the hostname is a strict subdomain matching
   `*.xlgames.com` or `*.xlgames.corp`. Require at least one label before the
   suffix, so the bare `xlgames.com` and `xlgames.corp` hosts do not match.
   Support normal HTTPS, SSH URL, and SCP-like Git remote forms, but reject
   lookalike suffixes such as `xlgames.com.example.org`.
3. If there is no primary remote, or multiple remaining remotes make the primary
   remote ambiguous, ask whether the repository is hosted under
   `*.xlgames.com` or `*.xlgames.corp` before choosing a workflow.
4. Apply all rules in **X7 repository workflow** only to an X7 GitLab-managed
   repository. For every other remote host, skip the X7 issue prefix, branch
   issue inference, programmer-number question, mandatory Korean message,
   Markdown-list body requirement, and generated `CodeGen` split.

## Non-X7 repository workflow

1. Inspect repository instructions and recent commit history, then follow the
   repository's established subject, language, body, and change-grouping
   conventions.
2. Do not ask for an X7 GitLab issue ID or programmer commit number solely
   because this skill was invoked.
3. Treat `Generated` paths like other paths unless the repository's own rules or
   the user require separate handling.
4. Stage only the requested changes, create local commits, and perform the final
   status and commit inspection described in the safety constraints.

## X7 repository workflow

### Required message format

- Use one numbering style consistently for every commit in the request:
  - Numbered: `x7/x7#<GitLab issue ID> (<programmer commit number>) <Korean subject>`.
  - Unnumbered: `x7/x7#<GitLab issue ID> <Korean subject>`.
- Write the subject and body in Korean. Keep required identifiers, code symbols,
  file names, and the literal generated-code subject `CodeGen` unchanged.
- Add a body after a blank line and summarize the commit as a Markdown list.
  Write each item as `- <Korean summary>` and describe only changes contained in
  that commit.
- Do not add `Co-Authored-By` or any other co-author trailer.

Example:

```text
x7/x7#12345 (2) 로그인 오류 처리 개선

- 만료된 인증 토큰의 오류 응답을 구분
- 재로그인 경로에 대한 테스트를 추가
```

Without programmer commit numbering:

```text
x7/x7#12345 로그인 오류 처리 개선

- 만료된 인증 토큰의 오류 응답을 구분
```

### Workflow

1. Confirm the current directory is inside a Git worktree. Inspect the branch,
   status, staged and unstaged diffs, untracked files, and recent relevant
   history before changing the index.
2. Derive the GitLab issue ID from the current branch name using only this rule:
   match digits at the very beginning followed by either `-` or the end of the
   name, and use those leading digits as the issue ID. Equivalently, use the
   capture from `^(\d+)(?:-|$)`. Examples: `1234-`, `1234`, and `1234-1` all
   produce issue ID `1234`. Do not extract digits from any other position or
   branch format. If the branch does not match, HEAD is detached, or a supplied
   issue ID conflicts with the derived value, ask the user for the issue ID
   before staging or committing. Never invent the issue ID. Read the current Git
   author identity and inspect reachable history for that author's existing
   commits whose subjects use the established issue ID.
3. Determine the numbering style before staging or committing:
   - If no existing commit by the current author uses that issue ID, ask whether
     to add programmer commit numbers. Do not infer the answer from other issue
     IDs or choose a default.
   - If the user says yes, start the first new commit at `(1)` and increment by
     one for each additional commit in this request.
   - If the user says no, omit the entire `(<programmer commit number>)` segment,
     including its parentheses, from every commit in this request.
   - If existing commits for the author and issue consistently use numbers,
     continue after the highest established number. If they consistently omit
     numbers, continue without numbers. Ask before proceeding when history is
     mixed, ambiguous, or conflicts with the user's supplied format.
4. Identify the requested change set and divide it into coherent commits when
   necessary. Preserve partially staged selections and stop for clarification
   if the requested scope cannot be separated safely from unrelated work.
5. Classify a path as generated when any path component equals `Generated`
   case-insensitively. Exclude every such path from all earlier commits,
   including tracked, untracked, renamed, and deleted files.
6. Review each non-generated commit's exact diff, stage only its paths or
   intended hunks, and commit it with the required subject and Markdown-list
   body. Do not use broad staging commands when they could include unrelated
   changes.
7. After every non-generated commit succeeds, stage all requested generated
   paths together and create exactly one final commit. Use `CodeGen` as the
   subject text. Produce
   `x7/x7#<GitLab issue ID> (<programmer commit number>) CodeGen` when numbering
   is enabled or `x7/x7#<GitLab issue ID> CodeGen` when it is disabled. Summarize
   the generated changes in a Korean Markdown list. If no generated paths
   changed, do not create a `CodeGen` commit.
8. When numbering is enabled, increment it for every created commit so the final
   `CodeGen` commit receives the last number.
9. Verify each proposed message contains one subject, a blank line, and only
   Markdown-list body items. Ensure it contains no co-author trailer, then run
   `git commit` without amending or bypassing hooks.
10. Inspect the resulting commits and final status. Confirm generated changes
   were committed last and together, then report commit hashes, subjects,
   remaining changes, and validation or hook results.

## Safety constraints

- Create local commits only. Never fetch, pull, push, force-push, rebase, merge,
  amend, reset, stash, clean, or discard changes unless separately requested.
- Never bypass commit hooks or signing requirements.
- Do not add `Co-Authored-By` or another attribution trailer unless the user
  explicitly requests it or the non-X7 repository requires it.
- Never commit secrets or files that appear to contain credentials. Stop and
  report the exact path when suspected.
- Do not claim success if a commit failed, the applicable message format is
  invalid, requested changes remain uncommitted, or an X7 generated change was
  included in an earlier commit.
