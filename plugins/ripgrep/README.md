# Ripgrep plugin

The `ripgrep` plugin adds `/ripgrep:search`, a reusable Claude Code workflow for
fast and safe repository search using the locally installed `rg` executable.

## Prerequisite

```text
rg --version
```

Install ripgrep through your operating system's package manager if this command
is unavailable.

## Examples

```text
/ripgrep:search find definitions and callers of ResolveWorkspaceRoot
/ripgrep:search list C++ files containing std::wstring, excluding Generated
/ripgrep:search find files named CMakeLists.txt under server projects
/ripgrep:search search the literal text foo[bar] in JSON files
```

The skill does not pre-approve `Bash(rg *)`. This is intentional: ripgrep has
options that can execute external commands. Normal Claude Code permissions stay
in effect.
