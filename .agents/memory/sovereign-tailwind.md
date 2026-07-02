---
name: Sovereign Tailwind v3 setup
description: Tailwind CSS v3 config for the sovereign artifact — critical pitfalls
---

**Rule:** Use `postcss.config.cjs` with `tailwindcss` plugin. Do NOT add `@tailwindcss/vite` to vite.config.ts — it is a v4-only plugin and breaks v3.

**Rule:** In `src/index.css`, `@import url(...)` statements MUST appear before any `@tailwind` directives. PostCSS enforces this order strictly and throws a build error otherwise.

**Why:** The repo was cloned from a Lovable project that had the Google Fonts `@import` after the `@tailwind` directives. This caused the `[vite:css][postcss] @import must precede all other statements` build error. Moved `@import` to line 1 to fix.

**How to apply:** Any time CSS imports are added to index.css, ensure they go before `@tailwind base`.
