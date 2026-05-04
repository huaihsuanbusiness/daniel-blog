# daniel-blog Deploy SOP

## Overview
This document records the verified local → GitHub → Cloudflare deployment path for `daniel-blog`.

- Repo: `https://github.com/huaihsuanbusiness/daniel-blog`
- Local path: `/Users/daniel/daniel-blog`
- Production branch: `main`
- Production domains:
  - `https://danielcanfly.com/`
  - `https://www.danielcanfly.com/`
- Stack: Astro 6 + TypeScript
- Package manager: npm
- Git remote: SSH
- Deployment: Cloudflare Git-connected deploy on push to `main`

## Verified state
The following has been verified:
- Local repo tracks `origin/main`
- GitHub SSH authentication works
- `git push origin main` succeeds
- Cloudflare auto-deploy triggers from pushes to `main`
- Production domains are routed correctly

## Standard working flow
### 1. Enter the repo
```bash
cd /Users/daniel/daniel-blog
```

### 2. Inspect current state
```bash
git status
git branch -vv
git remote -v
```

### 3. Make changes
Edit code/content as needed.

### 4. Validate locally
```bash
npm run build
```

Optional local dev:
```bash
npm run dev
```

### 5. Review diff
```bash
git diff --stat
git diff
```

### 6. Commit and push
```bash
git add <files>
git commit -m "<clear message>"
git push origin main
```

### 7. Verify production deployment
- Check Cloudflare for a new successful deployment
- Open the production site and confirm expected behavior

## Critical production caveat: Google Sheets secrets must ship with the uploaded version
The survey submit API can fail with:
```text
Error: GOOGLE_SHEET_ID is not set
```
when Cloudflare promotes a fresh Worker version that does not carry the three Google secrets on that exact version.

### Canonical fix (current standard path)
Use the repo script that uploads a Worker version **with** the Google secrets attached, then promotes that exact version:

```bash
cd /Users/daniel/daniel-blog

export GOOGLE_SHEET_ID='...'
export GOOGLE_SERVICE_ACCOUNT_EMAIL='...'
export GOOGLE_PRIVATE_KEY='...'

npm run deploy:cloudflare
```

This script:
1. builds the project
2. runs `wrangler versions upload --secrets-file ...`
3. captures the uploaded Worker Version ID
4. runs `wrangler versions deploy <that-version>`

### GitHub Actions path
The repo workflow `.github/workflows/deploy.yml` now uses the same script.
That means pushes to `main` should deploy through the version-upload-with-secrets path instead of the old broken flow.

### SESSION KV namespace requirement (critical)
`wrangler.jsonc` must explicitly bind the existing SESSION KV namespace **by id**:

```json
"kv_namespaces": [
  {
    "binding": "SESSION",
    "id": "1259cd31278c4af08e8765a9f61cc5ab"
  }
]
```

Reason:
- if the generated `dist/server/wrangler.json` contains `{"binding":"SESSION"}` without `id`,
  Wrangler will try to provision a new namespace;
- if a namespace with the same title already exists, deploy fails with Cloudflare error `code: 10014`.

Current standard protection:
- `scripts/deploy-with-secrets.sh` now patches `dist/server/wrangler.json` from `wrangler.jsonc`
- the script also verifies the SESSION binding id before upload

### Emergency fallback only
If the live site is already broken and you need to repair production manually, use the version-secret rebind flow:

```bash
cd /Users/daniel/daniel-blog

echo "$GOOGLE_SHEET_ID" | ./node_modules/.bin/wrangler versions secret put GOOGLE_SHEET_ID --name daniel-blog
echo "$GOOGLE_SERVICE_ACCOUNT_EMAIL" | ./node_modules/.bin/wrangler versions secret put GOOGLE_SERVICE_ACCOUNT_EMAIL --name daniel-blog
printf '%s' "$GOOGLE_PRIVATE_KEY" | ./node_modules/.bin/wrangler versions secret put GOOGLE_PRIVATE_KEY --name daniel-blog

./node_modules/.bin/wrangler versions deploy <LATEST_SECRET_BOUND_VERSION_ID> --name daniel-blog --message "prod: emergency rebind google secrets" --yes
```

### Mandatory verification after deploy / repair
```bash
curl -s "https://www.danielcanfly.com/api/campaign/ai-companion-submit" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"role":"caregiver","familyId":"sop_check","answers":{"Q0":"照顧者"},"locale":"zh"}'
```

Expected result:
- JSON contains `"success": true`
- no `GOOGLE_SHEET_ID is not set`
- no `GOOGLE_PRIVATE_KEY is not set`

### What not to trust
- raw `wrangler deploy` output alone
- a previous successful secret list
- old production behavior before the newest version was promoted

Always verify the live production API after deploys that can touch the survey pipeline.

## Triage checklist
If deployment appears broken, check in this order.

### Local repo state
```bash
cd /Users/daniel/daniel-blog
git status
git branch -vv
git remote show origin
```

### GitHub connectivity
```bash
git fetch origin
git ls-remote --heads origin
ssh -T git@github.com
```

### Build sanity
```bash
cat package.json
npm run build
python3 - <<'PY'
import json
with open('dist/server/wrangler.json') as f:
    d = json.load(f)
print(d.get('kv_namespaces'))
PY
```

Expected:
- `dist/server/wrangler.json` includes `{"binding": "SESSION", "id": "1259cd31278c4af08e8765a9f61cc5ab"}`
- not just `{"binding": "SESSION"}`

### Production reachability
```bash
curl -I https://danielcanfly.com/
curl -I https://www.danielcanfly.com/
```

### Cloudflare settings to confirm manually
- Production branch = `main`
- Build command = `npm run build`
- Git-connected deploy is active
- Custom domains include both apex and `www`
- If survey submission suddenly breaks after a fresh deploy, inspect Worker Versions / latest production version instead of assuming DNS or Pages issues

## Related SOPs
- Shared-folder article sync: `docs/shared-folder-sync-sop.md`

## Important note
A previous homepage flash issue was caused by Astro root redirect logic, not infrastructure failure.

Current intended behavior:
- `/` renders the English homepage directly
- `/en/` and `/zh/` remain language-specific routes
