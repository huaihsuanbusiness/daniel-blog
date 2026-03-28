# SPEC.md — danielcanfly

## Overview

Personal blog by Daniel, built with Astro and deployed on Cloudflare Pages. True static i18n: every language version is a fully independent HTML document.

## URL Structure

| URL | Description |
|-----|-------------|
| `/` | Redirects to `/en/` (301) |
| `/en/` | English homepage |
| `/zh/` | Chinese homepage |
| `/en/blog` | English blog list |
| `/zh/blog` | Chinese blog list |
| `/en/blog/:slug` | English article |
| `/zh/blog/:slug` | Chinese article |
| `/en/about` | English about page |
| `/zh/about` | Chinese about page |
| `/en/shop` | English shop page |
| `/zh/shop` | Chinese shop page |

## Design Principles

- **True static i18n**: No CSS show/hide toggling. Each language is a separate static HTML file.
- **Language switch**: URL redirect (e.g., `/en/blog/first-post` ↔ `/zh/blog/first-post`), not JS toggle.
- **Language detection**: Static paths — no client-side `?lang=` detection.
- **Content schema**: `categories` and `tags` are `string[]` arrays — open for extension, no enum validation.

## Content Schema

```typescript
{
  title: string;
  description: string;
  categories: string[];   // e.g. ["tech"], ["ai"]
  tags: string[];         // free-form tags
  date: Date;
  featured: boolean;      // default false
  coverImage?: string;
}
```

## Content Directory

```
src/content/blog/
  first-post/
    en.md
    zh.md
  ai-landscape-2026/
    en.md
    zh.md
```

The glob loader uses file extensionless IDs: `first-post/en`, `first-post/zh`, etc.

## Tech Stack

- **Framework**: Astro (static output)
- **Hosting**: Cloudflare Pages
- **Fonts**: Space Grotesk, Inter, JetBrains Mono, Noto Sans TC
- **Styling**: CSS custom properties + component-level styles
- **Build**: `npm run build` → `dist/`

## Astro Config

```js
i18n: {
  defaultLocale: 'en',
  locales: ['en', 'zh'],
  routing: {
    prefixDefaultLocale: true,
  },
}
```

## File Structure

```
src/
  content.config.ts          # Collection schema with glob loader
  content/
    blog/
      first-post/en.md, zh.md
      ai-landscape-2026/en.md, zh.md
  layouts/
    Base.astro               # <html lang={lang}>, no JS lang detection
  components/
    Header.astro             # currentLang from params, direct URL switcher
    Footer.astro             # Static — no bilingual CSS
    PostCard.astro           # Receives lang prop, renders correct language
    CategoryFilter.astro     # Reads categories from URL param
  pages/
    index.astro              # Redirects / → /en/
    [lang]/
      index.astro            # Homepage
      about.astro            # About page
      shop.astro             # Shop page
      blog/
        index.astro          # Blog list
        [...slug].astro      # Article page
  styles/
    global.css               # Design tokens, no bilingual CSS classes
  utils/
    readTime.ts              # Word count → minutes
```

## Build Validation

```bash
npm run build
# Expects: 13 pages built, 0 errors
```

Generated routes:
- `/en/` `/zh/`
- `/en/blog/` `/zh/blog/`
- `/en/blog/first-post/` `/zh/blog/first-post/`
- `/en/blog/ai-landscape-2026/` `/zh/blog/ai-landscape-2026/`
- `/en/about/` `/zh/about/`
- `/en/shop/` `/zh/shop/`
- `/` (redirect page)
