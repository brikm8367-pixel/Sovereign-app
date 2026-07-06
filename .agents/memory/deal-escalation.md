---
name: Deal escalation flow
description: Manager-to-celebrity deal approval workflow in BusinessDeals component.
---

## Rule
A manager can forward any pending deal card to the celebrity for approval before acting on it. The celebrity then approves, rejects, or requests revisions.

## Why
Managers have operational authority but some deals require celebrity consent. Escalation creates a formal approval step without taking the deal out of the manager's view.

## Columns added (same migration as multi-celebrity)
- `deal_cards.escalated_to_celebrity` boolean DEFAULT false
- `deal_cards.celebrity_approval_status` text CHECK IN ('pending','approved','rejected','revision')
- `deal_cards.escalation_note` text (manager note to celebrity)
- `deal_cards.celebrity_response_note` text (celebrity feedback)
- `deal_cards.escalated_at` timestamptz

## How to apply
- `BusinessDeals` receives `userRole: 'celebrity' | 'manager' | 'sender'` prop — pass from Dashboard.
- Manager sees: standard Accept/Counter/Decline + "إرسال للمشهور" button (inline form with optional note). On submit: updates deal_cards + inserts manager_activity_log row with action='deal_escalated'.
- While awaiting response: manager sees "في انتظار موافقة المشهور" badge (Hourglass icon).
- Celebrity sees: blue banner "طلب وكيلك موافقتك" + Approve/Reject/Revision buttons.
- On approve: sets celebrity_approval_status='approved' AND status='accepted'.
- On reject: sets celebrity_approval_status='rejected' AND status='declined'.
- On revision: sets celebrity_approval_status='revision', keeps deal pending, note sent back.
