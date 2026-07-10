---
name: search
description: Search repository file names or contents quickly and safely with ripgrep, including regex, literal, type, glob, and context filters
argument-hint: "<pattern or natural-language search request>"
---

# Safe repository search with ripgrep

Use the locally installed `rg` executable to satisfy this search request:

$ARGUMENTS

## Workflow

1. Translate the request into the narrowest useful ripgrep query. Search the
   current project unless the user explicitly provides another allowed path.
2. Prefer these forms:
   - File discovery: `rg --files` with `-g` filters.
   - Content search: `rg -n --color never <pattern> [path]`.
   - Literal text: add `-F` when regex semantics are not intended.
   - Smart case: add `-S` when case should follow the pattern's capitalization.
   - File types: use `-t<type>` or explicit `-g` filters.
   - Context: use `-C`, `-B`, or `-A` only when surrounding lines help.
   - Candidate reduction: use `-l` first when a broad query would produce too
     much output, then search the relevant files more narrowly.
3. Start narrow and broaden only when the initial query misses likely results.
   Respect `.gitignore`, hidden-file, and binary-file defaults unless the user
   explicitly asks otherwise.
4. Return a concise result with repository-relative paths and line numbers.
   State the effective pattern and important filters when they are not obvious.
5. If `rg` is unavailable, report that prerequisite instead of falling back to
   a slower recursive shell pipeline.

## Safety constraints

- Never use `--pre`, `--pre-glob`, or `--hostname-bin`. These options can invoke
  external commands and are outside this read-only search workflow.
- Never use shell redirection, command substitution, `Invoke-Expression`, or an
  additional shell/interpreter around `rg`.
- Do not use `--hidden`, `--no-ignore`, `--no-ignore-vcs`, or search outside the
  current project unless the user explicitly requests that broader scope.
- Do not transform a search request into file modification. Ripgrep output is
  evidence only; use the normal edit workflow if the user separately asks for
  changes.
- Avoid dumping huge result sets. Narrow by path, type, glob, literal mode, or
  candidate files and summarize repeated matches.
