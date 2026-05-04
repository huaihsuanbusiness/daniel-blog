# Rio Direct Push Troubleshooting

## Purpose
This document explains how to diagnose cases where Rio can analyze and plan changes but cannot directly modify files, commit, or push.

## Typical symptom
- Rio responds with instructions but cannot directly edit the repo.
- GitHub and Cloudflare appear healthy.
- Capability differs between sessions.

## Common root cause
This is often an OpenClaw tools policy issue, not a repository connectivity issue.

A restrictive configuration may leave only browser access while denying:
- `group:fs`
- `group:runtime`

That prevents direct file edits, shell commands, git operations, and push.

## Diagnose current tool policy
```bash
openclaw status
openclaw config get tools
```

### Example of a broken tool policy
```json
{
  "allow": ["browser"],
  "deny": ["group:fs", "group:runtime", "group:memory", "group:automation", "group:nodes", "canvas", "web_search", "web_fetch"]
}
```

## Recovery
Preferred reset-to-default approach:
```bash
openclaw config unset tools.allow
openclaw config unset tools.deny
openclaw gateway restart
openclaw config get tools
```

Expected healthy state:
- `tools` no longer restricts the agent to browser-only
- `group:fs` and `group:runtime` are no longer denied

## Important caveat
Old sessions may keep an earlier tool snapshot.

If Rio still cannot act directly after config recovery:
- start a new thread/session
- retry a small real repo change

## daniel-blog specific Cloudflare caveat
If the blog repo can push normally but deploy / survey backend breaks, it is often **deployment binding state**, not repo connectivity.

### Failure mode A — missing Google survey secrets
If production breaks with:
```text
Error: GOOGLE_SHEET_ID is not set
```
that can mean Cloudflare promoted a fresh Worker version without the three Google survey secrets bound to the live production version.

Current standard fix:
- use `npm run deploy:cloudflare`
- or let `.github/workflows/deploy.yml` deploy via `scripts/deploy-with-secrets.sh`

### Failure mode B — SESSION KV namespace reprovisioning (`code: 10014`)
If deploy fails with:
```text
a namespace with this account ID and title already exists [code: 10014]
```
that means the generated `dist/server/wrangler.json` has a SESSION binding without `id`, so Wrangler tries to create a duplicate KV namespace.

Current permanent fix:
- `wrangler.jsonc` stores the existing SESSION namespace id
- `scripts/deploy-with-secrets.sh` copies that id into `dist/server/wrangler.json` after build
- the script fails fast if the SESSION id is still missing

### Failure mode C — bad deploy-script patching
If CI fails with:
```text
KeyError: 'ROOT_DIR'
```
that means the deploy script referenced a shell variable inside Python without passing it through. The current script has been fixed to pass file paths as explicit CLI args.

See:
- `/Users/daniel/daniel-blog/docs/deploy-sop.md`
- `/Users/daniel/.openclaw/workspace-rio/memory/private/daniel-blog-sop.md`

## Verification
A valid end-to-end verification should include:
1. Rio edits a local repo file
2. local build succeeds if relevant
3. a commit is created
4. push to `main` succeeds
5. Cloudflare deploy triggers successfully
6. for survey-related deploys, the live production submit API returns `success: true`

## Safety note
If direct-push capability is enabled in Discord or other chat surfaces, keep approval controls and allowlists in place.
