# Shared Folder → Repo Sync SOP

## Purpose
This SOP records the safe sync path when Daniel updates article drafts under:

`/Users/daniel/.openclaw/shared-folder/docs/blog-articles/`

and wants repo / production to follow the **local shared-folder source of truth**.

Current primary use case:
- the 4-part series `AI 時代的產品節奏 / Product Rhythms in the Age of AI`

## Source / target mapping

### Shared-folder source directories
- `AI 時代的產品節奏 Part01 | 不是 Agile 過時了，是有些交付做法開始顯得老了`
- `AI 時代的產品節奏 Part02 | AI 不會先把 PM 取代掉，它先讓一些本來就不該那麼貴的工作變便宜`
- `AI 時代的產品節奏 Part03 | 我現在不太問要不要跑 Scrum，我比較常問哪個儀式還真的有用`
- `AI 時代的產品節奏 Part04 | 如果今天重新帶一支產品團隊，我不會照舊跑 Scrum`

### Repo targets
- `src/content/blog/pm-product-rhythms-ai-01/`
- `src/content/blog/pm-product-rhythms-ai-02/`
- `src/content/blog/pm-product-rhythms-ai-03/`
- `src/content/blog/pm-product-rhythms-ai-04/`

## Canonical sync rules

### 1. Shared-folder body content wins
For each article:
- use the shared-folder `zh-*.md` / `en-*.md` as the latest body content
- use shared-folder `resource/` assets as the latest image source

### 2. Repo frontmatter stays canonical
Do **not** blindly replace repo markdown files.

Keep repo frontmatter for:
- `date`
- `categories`
- `tags`
- `series`
- `seriesOrder`
- any future schema-required fields

Only update:
- `title`
- markdown body content

Reason:
- shared-folder drafts are plain markdown with `# Title`
- repo content is Astro collection content with required frontmatter
- replacing repo files wholesale can break build / sorting / collection schema

### 3. `Image Asset Plan` must not be published
If shared-folder drafts contain:

```md
## Image Asset Plan
```

strip that section before commit/deploy.

Reason:
- Daniel explicitly requested these sections not appear on the live site
- they are drafting notes, not reader-facing content

### 4. Never copy `resource/references.md` into Astro content tree
If shared-folder `resource/` contains `references.md`, do **not** keep it under:

- `src/content/blog/.../resource/references.md`

Reason:
- Astro can treat it as a content entry under `src/content`
- build then fails with missing required frontmatter/schema fields

### 5. Validate SVG/XML assets before deploy
If a synced SVG does not render, check for invalid XML first.

Known real failure mode:
- unescaped `&` inside `<text>`
- example: `Commit & trade-off`
- must become: `Commit &amp; trade-off`

Minimal rule:
- keep shared-folder asset as source of truth
- but apply the smallest XML-validity fix required for production rendering

## Recommended sync procedure

### Step 1. Inspect shared-folder source
```bash
ls -la "/Users/daniel/.openclaw/shared-folder/docs/blog-articles"
```

### Step 2. Confirm repo state
```bash
cd /Users/daniel/daniel-blog
git status
git branch -vv
```

### Step 3. Sync markdown + resources carefully
For each article:
- parse shared-folder markdown
- take first H1 as `title`
- replace repo body only
- preserve repo frontmatter
- sync `resource/` files
- exclude `resource/references.md`
- strip `Image Asset Plan`

### Step 4. Run build
```bash
cd /Users/daniel/daniel-blog
npm run build
```

### Step 5. If a new/updated SVG fails, validate it
```bash
python3 - <<'PY'
from pathlib import Path
import xml.etree.ElementTree as ET
p = Path('src/content/blog/pm-product-rhythms-ai-04/resource/scrum-lite-02-weekly-rhythm.svg')
ET.parse(p)
print('XML_OK')
PY
```

### Step 6. Commit and push
```bash
git add src/content/blog/pm-product-rhythms-ai-01 \
        src/content/blog/pm-product-rhythms-ai-02 \
        src/content/blog/pm-product-rhythms-ai-03 \
        src/content/blog/pm-product-rhythms-ai-04
git commit -m "feat: sync product rhythms series from local source files"
git push origin main
```

### Step 7. Force production deploy if needed
If Git-connected Pages deploy is slow, run:

```bash
npx wrangler pages deployment create dist \
  --project-name daniel-blog \
  --branch main \
  --commit-hash $(git rev-parse --short HEAD) \
  --commit-message "feat: sync product rhythms series from local source files"
```

## Validation checklist

### Content
- titles match latest shared-folder drafts
- body content reflects latest local edits
- no `Image Asset Plan` appears on live pages

### Assets
- article SVGs load successfully
- `weekly-rhythm.svg` renders instead of showing a broken image

### Build / deploy
- `npm run build` passes
- production URLs return 200
- Pages deployment finishes successfully

## Known pitfalls

### Pitfall 1: replacing repo files wholesale
Symptom:
- Astro content schema breaks
- ordering/date metadata gets lost

Fix:
- preserve repo frontmatter
- replace title/body only

### Pitfall 2: copying `references.md` into `src/content`
Symptom:
- Astro build fails with content collection schema errors

Fix:
- delete `resource/references.md` from repo content tree

### Pitfall 3: shared-folder SVG is visually right but XML-invalid
Symptom:
- image path exists
- browser requests 200
- image still fails to render in `<img>`

Fix:
- inspect raw SVG text
- escape XML special chars such as `&`

### Pitfall 4: shared-folder reintroduces stripped drafting notes
Symptom:
- `Image Asset Plan` reappears after sync

Fix:
- strip again before commit/build

## Suggested future improvement
If this sync pattern becomes frequent, add a repo script such as:
- `scripts/sync-product-rhythms-from-shared-folder.py`

That script should:
- map source dirs to slugs
- preserve repo frontmatter
- strip `Image Asset Plan`
- ignore `references.md`
- validate / minimally repair invalid SVG XML
- optionally print a dry-run diff summary
