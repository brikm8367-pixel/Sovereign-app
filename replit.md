# Sovereign

A premium Arabic-first platform connecting celebrities with fans and business opportunities via end-to-end encrypted messaging, deal cards, and manager delegation.

## Run & Operate

- `pnpm --filter @workspace/sovereign run dev` — run the frontend (port 23562)
- `pnpm --filter @workspace/sovereign run typecheck` — TypeScript check
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18 + Vite + Tailwind CSS v3 (PostCSS, NOT @tailwindcss/vite)
- Backend: Supabase (Auth, Database, Edge Functions, Realtime)
- Routing: react-router-dom v6
- UI: shadcn/ui components, framer-motion, sonner (toasts), vaul (drawer)
- E2E encryption: custom Web Crypto API implementation
- i18n: custom RTL/LTR context (Arabic default)
- API: Express 5 (api-server artifact, used for future extensions)
- DB: PostgreSQL + Drizzle ORM (api-server only)

## Where things live

- `artifacts/sovereign/src/` — main React app
- `artifacts/sovereign/src/hooks/` — useAuth, useDealCards, useE2E, etc.
- `artifacts/sovereign/src/utils/e2eManager.ts` — E2E key management with retry
- `artifacts/sovereign/src/lib/appUrl.ts` — public URL builder (reads VITE_APP_BASE_URL)
- `artifacts/sovereign/src/components/profile/` — InviteManagerDialog, KillSwitch, etc.
- `artifacts/sovereign/supabase/functions/` — Edge function source (deploy via Supabase CLI)
- `artifacts/sovereign/supabase/migrations/` — DB migration SQL files

## Architecture decisions

- Supabase is the source of truth for auth and data; no custom auth server
- E2E keys: one row per device in `device_keys` table; profiles.public_key kept for backward compat
- Manager invitation flow: password-verified edge function (`create-manager-invite`) creates short-lived tokens; celebrity must confirm password before any invite is issued
- Kill Switch: edge function `manager-kill-switch` immediately revokes manager access
- Deal Cards: filtered client-side by `archived_at`, `visible_to_celebrity`, sticky/golden-hour priority sort
- `@lovable.dev/cloud-auth-js` replaced with direct Supabase OAuth (Google/Apple via `supabase.auth.signInWithOAuth`)

## Product

Sovereign lets public figures (celebrities) receive, manage, and respond to business deal proposals (Deal Cards) from fans and agencies. Communication is end-to-end encrypted. Celebrities can delegate inbox management to a trusted manager via a secure invitation system, and revoke access via Kill Switch.

## User preferences

- Arabic-first RTL UI; English fallback supported
- Keep strict TypeScript flags off (`strict: false`, `strictNullChecks: false`) since the codebase uses `as any` casts for Supabase dynamic tables

## Gotchas

- PWA service worker: only ONE service worker is registered for scope "/", built via `vite-plugin-pwa`'s `injectManifest` strategy from `src/sw.ts` (Workbox precaching + push notifications combined). Never register a second SW (e.g. a standalone `/sw-push.js`) at the same scope — two workers fighting over the same scope was the root cause of the "PWA not responding / closes itself" production crash.
- `avatars` Supabase storage bucket is created via migration `20260708080000_avatars_bucket.sql` (bucket + RLS policies keyed on `name LIKE auth.uid()::text || '-%'` since files are stored at bucket root, not per-user folders). This migration must be run manually in the Supabase SQL editor (no DB credentials available from this environment).
- Tailwind CSS v3: uses `postcss.config.cjs` + `tailwindcss` plugin, NOT `@tailwindcss/vite`. Do NOT add `@tailwindcss/vite` to vite.config.ts
- `@import` in CSS must come BEFORE `@tailwind` directives (PostCSS rule)
- `vaul` package must be installed for the Drawer shadcn/ui component
- Supabase edge functions must be deployed via `supabase functions deploy` from the CLI — they cannot be deployed from Replit directly
- `VITE_APP_BASE_URL` env var controls the public share URL; Replit dev domain is excluded from share links (uses fallback public URL)
- `strictPropertyInitialization: false` must be set in sovereign tsconfig.json to avoid conflict with base tsconfig
- `signOut({ scope: 'local' })` used to avoid Supabase network errors on sign-out; falls back to full signOut if it fails

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Supabase project ID: dxfcxxiysntgxstmyxqz
