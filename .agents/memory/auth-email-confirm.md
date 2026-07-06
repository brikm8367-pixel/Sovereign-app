---
name: Auth email confirmation UX
description: Post-sign-up and email-not-confirmed UX in Auth.tsx.
---

## Rule
After a successful `signUp` call (no error), do NOT let the UI hang — immediately show an "emailConfirmSent" screen. If a sign-in attempt fails with email_not_confirmed, show a resend button inline in the error box.

## Why
Supabase requires email confirmation by default. Without this, new users see a blank form with no feedback and think sign-up failed.

## How to apply
- Auth.tsx **must** import `useLanguage` and destructure `isRTL` — all new string literals use it for Arabic/English.
- States: `emailConfirmSent`, `needsEmailConfirm`, `resending`.
- On signUp success (no error returned): `setEmailConfirmSent(true)` → renders standalone confirmation screen with back-to-login link.
- On signIn error matching `email_not_confirmed` or `email not confirmed`: `setNeedsEmailConfirm(true)` → shows resend button under the error message.
- `resendConfirmation()` calls `supabase.auth.resend({ type: 'signup', email })`, then sets `emailConfirmSent(true)`.
- `switchMode()` must reset `emailConfirmSent` and `needsEmailConfirm` to false.
