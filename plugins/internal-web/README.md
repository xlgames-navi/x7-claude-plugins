# Internal web plugin

The `internal-web` plugin reads private X7 intranet pages without sending them
to an external web service. For GitLab (`x7.xlgames.com`) and Jenkins
(`x7jenkins.xlgames.com`), it prefers a connected product MCP when one can
answer the request. Otherwise it prefers the active host's built-in browser:
Claude Desktop/Claude Code or ChatGPT Desktop/Codex. If sign-in is required,
the user completes it in the already-open embedded browser tab; the skill waits
and continues there without launching another browser for authentication.

## `/internal-web:read`

```text
/internal-web:read https://x7.xlgames.com/path summarize this page
/internal-web:read https://service.xlgames.corp/api/status extract the service status
```

HTTP(S) subdomains matching `*.xlgames.com` or `*.xlgames.corp` are allowed.
The apex domains and lookalike suffixes are rejected. The browser integration
validates the final URL and returns rendered page text without exporting cookies
or authorization headers. The bundled curl wrapper remains available for pages
that do not need interactive authentication; it validates every redirect, limits
time and output size, rejects binary responses, preserves TLS verification, and
removes its temporary cookie jar after each invocation.

When the host has no built-in browser and the page is known not to require
sign-in, the bundled browser MCP can use a dedicated Chrome, Edge, or NAVER
Whale profile. Set `X7_INTERNAL_BROWSER` to `chrome`, `edge`, or `whale` to
override the detected system default, and set `X7_INTERNAL_BROWSER_PATH` for a
custom executable. The legacy `X7_INTERNAL_CHROME_PATH` override remains
supported. Set `X7_INTERNAL_BROWSER_PROFILE` to override the dedicated profile
directory (default: `~/.x7-internal-browser/<browser>`). Firefox and Brave are
not supported yet. The guarded curl wrapper remains available for pages that
do not need interactive authentication.
