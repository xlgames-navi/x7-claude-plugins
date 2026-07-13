# Internal web plugin

The `internal-web` plugin reads private X7 intranet pages from the developer's
local Claude Code, Codex, or Antigravity process instead of an external web
service. Authenticated pages open in the supported system default browser using
a dedicated, persistent profile. Chrome, Microsoft Edge, and NAVER Whale are
supported. Sign in there once, then retry the request.

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

The supported system default browser is detected automatically. Set
`X7_INTERNAL_BROWSER` to `chrome`, `edge`, or `whale` to override it, and set
`X7_INTERNAL_BROWSER_PATH` for a custom executable location. The legacy
`X7_INTERNAL_CHROME_PATH` override remains supported. Set
`X7_INTERNAL_BROWSER_PROFILE` to override the selected browser's dedicated
profile directory (default: `~/.x7-internal-browser/<browser>`). Firefox and
Brave are not supported yet.
