---
name: Multi-celebrity manager flow
description: How a manager handles multiple celebrities — active selection, switching, and kill-switch cleanup.
---

## Rule
A manager account can manage N celebrities concurrently. The "active" one is stored in `profiles.active_celebrity_id` (uuid FK → profiles). All deal-card and messaging queries use this active ID as the filter target.

## Why
Fans submit deal cards to a specific celebrity. The manager must be able to switch which celebrity's inbox they're currently viewing without a hard reload.

## How to apply
- `useRole` fetches all `manager_links` (status=active) for the user, loads all linked celebrity profiles, then resolves `active_celebrity_id` from the DB row (falls back to first in list if null or stale).
- `switchCelebrity(id)` — optimistically updates local state first, then persists to `profiles.active_celebrity_id`.
- `CelebritySwitcher` component renders only when `managedCelebrities.length > 1`.
- After redeeming a manager invite (`RedeemManagerInvite`), call `switchCelebrity(data.celebrity_id)` immediately so the dashboard shows the new celebrity.
- `manager-kill-switch` edge function — after revoking links, also runs `UPDATE profiles SET active_celebrity_id = NULL WHERE id IN (revokedIds) AND active_celebrity_id = celebrity_id` to clean up stale pointers.
- Migration: `20260703080801_multi_celeb_escalation.sql` — `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_celebrity_id uuid REFERENCES profiles(id) ON DELETE SET NULL`.
