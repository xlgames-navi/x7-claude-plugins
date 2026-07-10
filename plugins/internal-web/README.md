# Internal web plugin

The `internal-web` plugin reads private X7 intranet pages from the developer's
local Claude Code process instead of an external web service.

## `/internal-web:read`

```text
/internal-web:read https://x7.xlgames.com/path summarize this page
/internal-web:read https://service.xlgames.corp/api/status extract the service status
```

HTTP(S) subdomains matching `*.xlgames.com` or `*.xlgames.corp` are allowed.
The apex domains and lookalike suffixes are rejected. The bundled wrapper
performs GET requests, validates every redirect, limits time and output size,
rejects binary responses, preserves TLS verification, and removes its temporary
cookie jar after each invocation.
