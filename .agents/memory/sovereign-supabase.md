---
name: Sovereign Supabase patterns
description: Key Supabase auth and data patterns used in the Sovereign app
---

**OAuth:** `@lovable.dev/cloud-auth-js` was removed and replaced with direct `supabase.auth.signInWithOAuth({ provider: 'google' | 'apple', options: { redirectTo } })` in `src/integrations/lovable/index.ts`.

**Sign-out:** Uses `supabase.auth.signOut({ scope: 'local' })` first to avoid network errors when connectivity is limited, with a fallback to plain `signOut()`. Always clears E2E keys via `clearE2EKeysOnSignOut()` before the Supabase call.

**Delete account:** Calls the `delete-account` Supabase Edge Function which (1) calls `delete_user_data` RPC to wipe app data, then (2) uses admin client to delete auth.users row. Frees the email for re-registration.

**E2E keys:** Per-device key in `device_keys` table (upsert on `user_id,device_id`). `profiles.public_key` kept for backwards compat but only written if missing. Retry wrapper (`withRetry`) applied to network calls in `e2eManager.ts`. Fallback: tries all sender device keys on decryption failure before giving up.

**Dynamic tables:** Use `(supabase as any).from('tablename')` for tables not in the generated types (e.g. `device_keys`, `deal_cards`).
