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

## Critical production caveat: Google Sheets secrets are version-sensitive
The survey submit API can fail with:
```text
Error: GOOGLE_SHEET_ID is not set
```
when Cloudflare promotes a fresh Worker version that does not yet have the three Google secrets bound to the live production version.

### Secrets affected
- `GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`

### Important rule
After any production deploy that affects the survey backend or creates a fresh Worker version, do **not** assume the new production version still has working Google secrets.

### Recovery / post-deploy rebind flow
Use secure local sources for the real secret values. Do **not** commit secret payload files into git.

```bash
cd /Users/daniel/daniel-blog

# 1) Rebind sheet id
echo "$GOOGLE_SHEET_ID" | ./node_modules/.bin/wrangler versions secret put GOOGLE_SHEET_ID --name daniel-blog

# 2) Rebind service account email
echo "$GOOGLE_SERVICE_ACCOUNT_EMAIL" | ./node_modules/.bin/wrangler versions secret put GOOGLE_SERVICE_ACCOUNT_EMAIL --name daniel-blog

# 3) Rebind private key / credential payload
cat /secure/path/google_private_key_secret.txt | ./node_modules/.bin/wrangler versions secret put GOOGLE_PRIVATE_KEY --name daniel-blog
```

Wrangler prints a new version id after each command. Deploy the **last** version id created by the final secret update:

```bash
./node_modules/.bin/wrangler versions deploy <LATEST_SECRET_BOUND_VERSION_ID> --name daniel-blog --message "prod: bind google secrets to latest survey build" --yes
```

### Mandatory verification after rebind
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
- `wrangler deploy` output alone
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
```

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
