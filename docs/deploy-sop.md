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

## Important note
A previous homepage flash issue was caused by Astro root redirect logic, not infrastructure failure.

Current intended behavior:
- `/` renders the English homepage directly
- `/en/` and `/zh/` remain language-specific routes
