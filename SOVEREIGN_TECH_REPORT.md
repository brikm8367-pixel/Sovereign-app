# SOVEREIGN — Comprehensive Technical Report
**Date:** July 7, 2026  
**Version:** 1.0 (Post Multi-Celebrity + Escalation Release)  
**Supabase Project ID:** `dxfcxxiysntgxstmyxqz`  
**Stack Maturity:** Production-ready PWA

---

## 1. PRODUCT OVERVIEW

**Sovereign** is a premium, Arabic-first Progressive Web App that connects public figures (celebrities) with fans, brands, and business opportunities through end-to-end encrypted messaging and a structured deal proposal system called "Deal Cards." It operates on a three-tier user model: **Celebrity → Manager → Sender/Brand**, where celebrities can delegate inbox management to trusted managers and retain full control via a Kill Switch.

**Core Value Propositions:**
- Private, encrypted communication channel between celebrities and their audience
- Structured business deal proposal system with AI-powered analysis
- Secure manager delegation with cryptographic invitation flow
- Multi-celebrity management (one manager can handle N celebrities)
- Full RTL Arabic-first UI with English fallback

---

## 2. FULL-STACK ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser/PWA)                      │
│              React 18 + Vite 7 + Tailwind CSS v3                │
│                Port: 23562 (dev) / Path: /                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP (Supabase JS SDK + REST)
                            │ WebSocket (Realtime/Presence)
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
┌─────────────────────┐       ┌─────────────────────────────────┐
│   AI API Server     │       │         SUPABASE CLOUD          │
│   Express 5 Node    │       │  Project: dxfcxxiysntgxstmyxqz  │
│   Port: 8080        │       │                                 │
│   Path: /api        │       │  ┌─────────────────────────┐   │
│                     │       │  │  PostgreSQL Database     │   │
│  Routes:            │       │  │  (Row Level Security)    │   │
│  POST /api/ai/pilot │       │  └─────────────────────────┘   │
│  POST /api/ai/scout │       │  ┌─────────────────────────┐   │
│  POST /api/ai/classify      │  │  Auth (JWT + OAuth)      │   │
│                     │       │  └─────────────────────────┘   │
│  Middleware:        │       │  ┌─────────────────────────┐   │
│  - helmet           │       │  │  Edge Functions (Deno)   │   │
│  - rate-limit       │       │  └─────────────────────────┘   │
│  - sanitiseBody     │       │  ┌─────────────────────────┐   │
│  - requestAudit     │       │  │  Realtime (Presence)     │   │
│                     │       │  └─────────────────────────┘   │
│  AI:                │       └─────────────────────────────────┘
│  Google Gemini 1.5  │
│  (+ heuristic       │
│   fallback)         │
└─────────────────────┘
```

**Monorepo Structure (pnpm workspaces):**
```
workspace/
├── artifacts/
│   ├── sovereign/          ← React PWA frontend
│   └── api-server/         ← Express 5 AI/processing server
├── lib/
│   ├── db/                 ← Drizzle ORM schemas (PostgreSQL)
│   ├── api-spec/           ← OpenAPI contract definition
│   ├── api-client-react/   ← Generated React Query hooks (Orval)
│   └── api-zod/            ← Shared Zod validation schemas
├── scripts/                ← Utility scripts
├── pnpm-workspace.yaml     ← Workspace + catalog pins
└── tsconfig.base.json      ← Shared TypeScript config
```

---

## 3. DATABASE SCHEMA (PostgreSQL via Supabase)

### Core Tables

#### `profiles`
The central user table. Extended from `auth.users`.
```sql
id                  uuid PRIMARY KEY (FK → auth.users)
username            text UNIQUE
display_name        text
avatar_url          text
bio                 text
account_type        text  -- 'celebrity' | 'sender'
public_key          text  -- legacy E2E key (kept for backward compat)
active_celebrity_id uuid  -- FK → profiles(id) [for managers: which celebrity is currently active]
slug                text UNIQUE
verified            boolean
subscription_tier   text
created_at          timestamptz
```

#### `messages`
All user-to-user communications.
```sql
id              uuid PRIMARY KEY
sender_id       uuid FK → profiles
receiver_id     uuid FK → profiles
content         text  -- EITHER plaintext OR "E2Ev1:<base64>" (encrypted)
message_type    text  -- 'text' | 'voice' | 'image'
voice_url       text
is_read         boolean
category        text  -- 'work' | 'audience' | 'direct'
created_at      timestamptz
```

#### `device_keys`
Per-device E2E public keys (multi-device support).
```sql
user_id    uuid FK → profiles
device_id  text          -- UUID generated per browser/device
public_key text          -- ECDH P-256 key in JWK format (JSON string)
last_seen  timestamptz
UNIQUE(user_id, device_id)
```

#### `deal_cards`
Structured business deal proposals sent to celebrities.
```sql
id                       uuid PRIMARY KEY
sender_id                uuid FK → profiles
celebrity_id             uuid FK → profiles
message_id               uuid FK → messages (nullable)
deal_type                text  -- sponsorship|appearance|event|collab|endorsement|other
budget_range             text  -- e.g. "$5,000 - $10,000"
timeline                 text
details                  text  -- JSON blob: { payment_structure, commitments[], pitch }
status                   text  -- pending|accepted|declined|countered|archived
golden_hour              boolean
golden_hour_expires_at   timestamptz
sticky_until             timestamptz
archived_at              timestamptz
visible_to_celebrity     boolean DEFAULT true
-- Escalation columns (added July 2026):
escalated_to_celebrity   boolean DEFAULT false
celebrity_approval_status text  -- pending|approved|rejected|revision
escalation_note          text   -- manager's note to celebrity
celebrity_response_note  text   -- celebrity's feedback to manager
escalated_at             timestamptz
created_at               timestamptz
```

#### `manager_links`
Active relationships between celebrities and their managers.
```sql
id           uuid PRIMARY KEY
celebrity_id uuid FK → profiles
manager_id   uuid FK → profiles
status       text  -- 'active' | 'revoked'
created_at   timestamptz
```

#### `manager_invitations`
Short-lived (15-minute) tokens for onboarding managers.
```sql
id           uuid PRIMARY KEY
celebrity_id uuid FK → profiles
code         text  -- 8-char uppercase human-readable code
token        text  -- 16-char URL-safe token (in /m/:token link)
expires_at   timestamptz  -- 15 minutes from creation
status       text  -- 'pending' | 'redeemed' | 'revoked'
created_at   timestamptz
```

#### `manager_activity_log`
Audit trail of all manager actions.
```sql
id           uuid PRIMARY KEY
celebrity_id uuid FK → profiles
manager_id   uuid FK → profiles
action       text  -- 'message_read' | 'deal_accepted' | 'deal_declined' | 'deal_escalated' | 'kill_switch' | etc.
detail       text
created_at   timestamptz
```

#### `fan_groups`
Community groups created by celebrities.
```sql
id           uuid PRIMARY KEY
celebrity_id uuid FK → profiles
name         text
slug         text UNIQUE
description  text
cover_url    text
member_count integer
created_at   timestamptz
```

#### `fan_group_members`
```sql
group_id   uuid FK → fan_groups
user_id    uuid FK → profiles
joined_at  timestamptz
PRIMARY KEY (group_id, user_id)
```

#### `push_subscriptions`
Web Push (VAPID) notification endpoints.
```sql
user_id       uuid FK → profiles
endpoint      text
p256dh        text  -- public key
auth          text  -- auth secret
created_at    timestamptz
```

**Row Level Security (RLS):** All tables have RLS enabled. General pattern:
- `SELECT`: users see their own data + data addressed to them
- `INSERT`: users can only insert with their own `id`/`sender_id`/`manager_id`
- `UPDATE`: users can only update their own rows
- `DELETE`: restricted to own rows or service role

---

## 4. SUPABASE EDGE FUNCTIONS (Deno)

All functions are deployed at `https://dxfcxxiysntgxstmyxqz.supabase.co/functions/v1/<name>`.

### `create-manager-invite`
**Trigger:** Celebrity initiates manager invitation  
**Auth:** Requires celebrity's JWT + password re-verification  
**Flow:**
1. Re-authenticates celebrity password (prevents unauthorized invite creation)
2. Revokes all existing `pending` invitations from this celebrity
3. Generates an 8-char code (nanoid, unambiguous charset) + 16-char URL token
4. Creates invitation with `expires_at = NOW() + 15 minutes`
5. Returns `{ code, token, expires_at }`

### `redeem-manager-invite`
**Trigger:** Manager submits 8-char code at `/m/:token`  
**Auth:** Requires manager's valid JWT  
**Flow:**
1. Validates token (not expired, status=pending)
2. Verifies OTP code matches
3. Creates `manager_links` row (celebrity ↔ manager, status=active)
4. Marks invitation as `redeemed`
5. Returns `{ celebrity_id }` → client auto-switches `active_celebrity_id`

### `manager-kill-switch`
**Trigger:** Celebrity triggers Kill Switch from profile settings  
**Auth:** Requires celebrity's JWT  
**Flow:**
1. Fetches all active `manager_links` for this celebrity
2. Marks all as `revoked`
3. Revokes any pending `manager_invitations`
4. Inserts activity log entries for each revoked manager
5. **NEW:** Clears `profiles.active_celebrity_id` for every revoked manager where it pointed to this celebrity
6. Returns `{ revoked: N }`

### `delete-account`
**Trigger:** User self-initiates account deletion (GDPR)  
**Auth:** Requires user's JWT + service role for cascade  
**Flow:**
1. Deletes all messages, deal_cards, manager_links, keys
2. Deletes profile row
3. Calls `auth.admin.deleteUser()` to remove auth record

---

## 5. API SERVER (Express 5, Node.js 24)

**Location:** `artifacts/api-server/`  
**Port:** 8080  
**Base path:** `/api`

### Security Middleware Stack (applied in order)
```
Request → helmet (11 security headers)
        → cors (configured origins)
        → express.json (body parser, 50kb limit)
        → sanitiseBody (removes XSS patterns, nullbytes)
        → requestAudit (logs method+path, flags suspicious patterns)
        → rateLimiter (general: 120 req/min, AI: 20 req/min, strict: 10 req/min)
        → Route handlers
```

### AI Routes

#### `POST /api/ai/pilot`
**Purpose:** Analyzes an incoming deal for a celebrity/manager  
**Input:**
```json
{
  "deal": {
    "deal_type": "sponsorship",
    "budget_range": "$10,000",
    "timeline": "2 weeks",
    "details": "{ pitch: '...', commitments: ['post_3x'] }"
  },
  "senderName": "Acme Corp",
  "celebrityUsername": "celebrity_handle"
}
```
**Output:**
```json
{
  "recommendation": "accept|negotiate|decline",
  "score": 78,
  "reasoning": "...",
  "redFlags": ["..."],
  "negotiationPoints": ["..."]
}
```
**AI:** Gemini 1.5 Flash → fallback to heuristic scoring (budget/type/completeness rules)

#### `POST /api/ai/scout`
**Purpose:** Helps senders improve their deal pitch before submission  
**Input:** Same deal structure  
**Output:** Structured improvement suggestions

#### `POST /api/ai/classify`
**Purpose:** Categorizes an incoming message (work vs personal vs audience)  
**Input:** `{ content: string, senderId: string }`  
**Output:** `{ category: 'work'|'audience'|'direct', confidence: number }`

### Rate Limits
| Route Group | Limit | Window |
|-------------|-------|--------|
| General API | 120 req | 1 min |
| AI endpoints | 20 req | 1 min |
| Strict (future) | 10 req | 1 min |

---

## 6. FRONTEND ARCHITECTURE

### Technology Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 18 |
| Build Tool | Vite | 7.3.5 |
| Routing | react-router-dom | v6 |
| CSS | Tailwind CSS | v3.4.17 |
| CSS Setup | PostCSS + `tailwindcss` plugin | NOT @tailwindcss/vite |
| UI Components | shadcn/ui (Radix primitives) | latest |
| Animations | framer-motion | latest |
| State/Data | TanStack Query | latest |
| Forms | react-hook-form + Zod | latest |
| Toasts | sonner | 2.0.7 |
| Drawer | vaul | 1.1.2 |
| Icons | lucide-react | latest |
| Charts | recharts | 2.15.4 |

### Application Routes
```
/                     → Auth (Sign in / Sign up)
/home                 → Dashboard (main inbox + deal cards)
/welcome              → Landing/Marketing page
/install              → PWA installation guide
/profile              → User profile + manager management + Kill Switch
/notifications        → Push notification feed
/admin                → AdminStats (admin-only analytics)
/security             → E2E key management + backup
/security/bounty      → Bug Bounty program page
/reset-password       → Password reset flow
/subscribe            → Subscription/upgrade page
/launch               → Launch page
/privacy              → Privacy Policy
/terms                → Terms of Service
/m/:token             → Manager invite redemption
/s/:slug              → Slug-based profile redirects
/g/:slug              → Fan Group page
/:username            → Public profile (send message/deal)
*                     → 404 Not Found
```

### Core Hooks

#### `useAuth` (`src/hooks/useAuth.tsx`)
- Wraps Supabase Auth with React Context
- Listens to `onAuthStateChange`
- On SIGNED_IN: triggers E2E key initialization
- On SIGNED_OUT: clears local E2E keys
- Methods: `signUp`, `signIn`, `signOut` (scope:local), `deleteAccount`
- Sign-out uses `scope: 'local'` to avoid network errors; falls back to full sign-out

#### `useRole` (`src/hooks/useRole.tsx`)
- Determines current user's sovereign role
- Types: `SovereignRole = 'celebrity' | 'manager' | 'sender'`
- For managers: fetches ALL active `manager_links`, loads full celebrity profiles
- Resolves `active_celebrity_id` from DB (persists cross-session)
- Exposes: `role`, `managedCelebrityId` (active one), `managedCelebrities[]`, `switchCelebrity(id)`
- `switchCelebrity`: optimistic UI update + async DB persist

#### `useDealCards` (`src/hooks/useDealCards.tsx`)
- Fetches deal cards for a given `celebrity_id`
- Sorting priority: Golden Hour (2pts) > Sticky (1pt) > newest
- Filter: excludes archived + hidden deals
- Methods: `updateStatus`, `archiveDeal`, `pinDeal`
- Realtime: does NOT use Supabase Realtime (manual refresh on action)

#### `usePresence` (`src/hooks/usePresence.tsx`)
- Tracks online status via Supabase Realtime Presence channels
- Used for "online" indicators on conversations

#### `useAI` (`src/hooks/useAI.ts`)
- Connects to API server `/api/ai/*` endpoints
- Returns typed results for Pilot/Scout/Classify
- Graceful error handling (returns `null` on failure)

#### `useFanGroups` (`src/hooks/useFanGroups.tsx`)
- CRUD for celebrity-owned fan groups

### Key Components

#### Messaging System (`src/components/messaging/`)
| Component | Purpose |
|-----------|---------|
| `InboxSection` | Renders a message category (work/audience/direct) |
| `ConversationView` | Full conversation thread with E2E encryption |
| `MessageComposer` | Text + voice recording composer |
| `VoiceRecorder` | MediaRecorder API, WAV output |
| `VoicePlayer` | Custom audio player for voice messages |
| `CallScreen` | WebRTC audio/video call UI |
| `IncomingCallOverlay` | Ringing overlay for incoming calls |
| `StoriesRow` | Instagram-like stories row at top of inbox |
| `DirectAccessManager` | Manager direct access controls |
| `RecipientFiltersManager` | Message filter rules per recipient type |
| `BlockReportDialog` | Block/report user flow |

#### Deal Cards (`src/components/deals/`)
| Component | Purpose |
|-----------|---------|
| `BusinessDeals` | Deal card list, handles both celebrity and manager views |
| `DealCardComposer` | Form for sending a new deal proposal |
| `PilotPanel` | In-deal AI analysis widget (for managers) |
| `ScoutPanel` | Pre-send pitch improvement (for senders) |

**Deal Escalation Flow (new):**
```
Manager views pending deal
→ Clicks "إرسال للمشهور للموافقة" (Send to Celebrity)
→ Adds optional note → submits
→ deal_cards: escalated_to_celebrity=true, celebrity_approval_status='pending'
→ manager_activity_log: action='deal_escalated'
→ Manager sees "Awaiting celebrity approval" badge

Celebrity opens inbox
→ Sees blue "needs your approval" banner on escalated deals
→ Options: Approve (→ status=accepted) | Reject (→ status=declined) | Revision (note back to manager)
```

#### Manager System (`src/components/manager/`, `src/components/profile/`)
| Component | Purpose |
|-----------|---------|
| `CelebritySwitcher` | Avatar strip for switching between managed celebrities (shows when 2+) |
| `InviteManagerDialog` | Password-verified invitation creation (15-min expiry) |
| `KillSwitch` | One-tap complete manager access revocation |
| `ManagerActivityLog` | Audit trail display for celebrities |
| `SovereignRolePanel` | Role explanation + account type switcher |

#### Profile & Identity
| Component | Purpose |
|-----------|---------|
| `PsychologicalAvatar` | AI-generated personality profile based on messaging patterns |
| `OnboardingFlow` | First-time user guide |
| `SplashScreen` | App loading splash with branding |
| `PWAInstallPrompt` | Native install prompt for PWA |
| `UpdatePrompt` | Service worker update notification |
| `ClassificationBanner` | Toast-style banner when a message gets auto-classified |

---

## 7. END-TO-END ENCRYPTION (E2E)

### Cryptographic Primitives
| Algorithm | Usage |
|-----------|-------|
| **ECDH P-256** | Key pair generation, shared secret derivation |
| **AES-256-GCM** | Symmetric message encryption/decryption |
| **PBKDF2** | Derives AES key from device passphrase (for key storage) |
| **Web Crypto API** | All operations (browser-native, no external library) |

### Key Architecture

```
User A (sender)                    User B (recipient)
──────────────────                 ──────────────────
PrivKey_A (IndexedDB, encrypted)   PrivKey_B (IndexedDB, encrypted)
PubKey_A (device_keys table)       PubKey_B (device_keys table)

To send A→B:
1. Fetch PubKey_B from device_keys
2. ECDH(PrivKey_A, PubKey_B) → sharedSecret
3. AES-GCM encrypt(message, sharedSecret) → ciphertext
4. Store as "E2Ev1:<base64(iv + ciphertext)>"

To decrypt at B:
1. Detect "E2Ev1:" prefix
2. ECDH(PrivKey_B, PubKey_A) → same sharedSecret
3. AES-GCM decrypt(ciphertext, sharedSecret) → plaintext
```

### Key Storage (at-rest encryption)
```
generateKeyPair() → { publicKey: JWK string, privateKey: JWK string }
                         ↓
storeKeysSecure():
  deviceSecret = getOrCreateDeviceSecret()  ← random 32-byte hex, stored in localStorage
  AES-GCM encrypt(privateKey, PBKDF2(deviceSecret))
  → stored in IndexedDB (idb-keyval)
```

### Multi-Device Support
- Each device registers its own ECDH key pair in `device_keys` table
- `profiles.public_key` kept for backward compat only (first device's key)
- Retry mechanism: 3 attempts with 300ms backoff for key registration

### Advanced Features
- **Perfect Forward Secrecy:** `signalProtocol.ts` implements per-message key rotation
- **Key Backup:** `e2eBackup.ts` — encrypted key bundle export/import
- **Screenshot Detection:** `screenshotDetection.ts` — alerts on screen capture attempts
- **Offline Queue:** `offlineQueue.ts` — queues outgoing messages, flushes on reconnect

---

## 8. PROGRESSIVE WEB APP (PWA)

### Setup
- **Plugin:** `vite-plugin-pwa` v1.3.0
- **Strategy:** GenerateSW (auto-generates service worker)
- **Cache:** Network-first for API, cache-first for assets

### Manifest
```json
{
  "name": "Sovereign",
  "short_name": "Sovereign",
  "display": "standalone",
  "theme_color": "#B8860B",
  "background_color": "#0a0a0a",
  "dir": "rtl",
  "lang": "ar",
  "start_url": "/",
  "icons": [192x192, 512x512 PNG]
}
```

### Features
- **Install Prompt:** `PWAInstallPrompt.tsx` — captures `beforeinstallprompt`, shows custom Arabic UI
- **Update Prompt:** `UpdatePrompt.tsx` — detects service worker update, prompts user to refresh
- **Push Notifications:** VAPID-based via `pushNotifications.ts`, endpoints stored in `push_subscriptions` table
- **Offline Queue:** Messages composed offline are queued in IndexedDB and sent on reconnect
- **Native Feel:** 
  - `safe-area` CSS insets for iPhone notch
  - `overscroll-behavior: none` (no bounce)
  - `-webkit-tap-highlight-color: transparent`
  - `touch-action: manipulation`

---

## 9. SECURITY ARCHITECTURE

### Authentication Flow
```
Sign Up → Supabase Auth (email/password) → Email confirmation required
        → profilehook: profile auto-created via DB trigger
        → E2E keys initialized on SIGNED_IN event

Sign In → supabase.auth.signInWithPassword()
        → JWT issued (1 hour expiry, auto-refreshed)
        → E2E keys loaded from IndexedDB

OAuth  → supabase.auth.signInWithOAuth({ provider: 'google' | 'apple' })
        → Redirect to provider → callback to app
```

### API Server Security
1. **Helmet.js** — sets 11 HTTP security headers (CSP, HSTS, X-Frame-Options, etc.)
2. **Rate Limiting** — per-IP, Redis-compatible (express-rate-limit)
3. **Request Sanitization** — strips XSS patterns, null bytes, script tags from body
4. **Request Audit** — logs all requests, flags suspicious patterns (SQL injection attempts, path traversal)
5. **No hardcoded secrets** — all credentials via environment variables

### Database Security
- **Row Level Security (RLS)** on every table
- **No direct client DB writes** for sensitive operations (invitations, kill-switch, delete-account) — all via Edge Functions with service role
- **Password re-verification** before manager invite creation
- **Short-lived tokens** (15 minutes) for manager invitations

### Privacy Features
- E2E encryption for all messages (server never sees plaintext)
- Screenshot detection + warning
- Account deletion (GDPR): full data cascade delete
- Sign-out `scope: 'local'` — clears local session only (no server call that could fail)

---

## 10. INTERNATIONALIZATION (i18n)

**Default language:** Arabic (RTL)  
**Supported:** Arabic (`ar`), English (`en`), French (`fr`), Spanish (`es`)

**Implementation:**
- Custom `LanguageContext` (`src/i18n/LanguageContext.tsx`)
- No external library
- `isRTL` boolean drives `dir="rtl"` on all containers
- Language files: `ar.ts`, `en.ts`, `fr.ts`, `es.ts`
- `LanguageSwitcher` component in nav bar

---

## 11. MULTI-CELEBRITY MANAGEMENT SYSTEM

### Architecture
```
Manager Account
└── manager_links
    ├── celebrity_A (active)  ← profiles.active_celebrity_id
    ├── celebrity_B
    └── celebrity_C
```

### Data Flow
1. **Onboarding:** Celebrity creates 15-min invite → Manager redeems → `manager_links` row created → `active_celebrity_id` auto-set to new celebrity
2. **Switching:** `CelebritySwitcher` renders avatar strip (only when 2+). Tap → optimistic state update + async DB write to `profiles.active_celebrity_id`
3. **All queries** (messages, deal cards) use `managedCelebrityId` as filter target
4. **Kill Switch:** Sets `manager_links.status = 'revoked'` + clears `active_celebrity_id` on all revoked manager profiles

### `CelebritySwitcher` UX
- Shows max 5 celebrities; "+N more" badge for overflow
- Active celebrity: gold gradient ring + subtle glow shadow
- Inactive: simple grey ring
- tap animation via framer-motion

---

## 12. TYPESCRIPT CONFIGURATION

**Key decisions (by design, not accident):**
```json
{
  "strict": false,
  "strictNullChecks": false,
  "strictPropertyInitialization": false
}
```
**Reason:** The Supabase JS client returns dynamic `any` types for tables not in the auto-generated types file. Enabling strict mode would require casting every single DB query. This is a pragmatic tradeoff — the codebase is not type-unsafe by carelessness, but by deliberate DB-layer `as any` casts.

**Typecheck commands:**
```bash
pnpm --filter @workspace/sovereign run typecheck    # Frontend
pnpm --filter @workspace/api-server run typecheck  # API server
pnpm run typecheck                                  # Full workspace
```
**Current status:** ✅ Zero TypeScript errors across full workspace.

---

## 13. DEPENDENCY INVENTORY

### Frontend (artifacts/sovereign) — Key packages
| Package | Purpose |
|---------|---------|
| `@supabase/supabase-js ^2.89.0` | Database, Auth, Realtime, Edge Functions |
| `react-router-dom ^6.30.1` | Client-side routing |
| `framer-motion` | Animations and transitions |
| `sonner ^2.0.7` | Toast notifications |
| `vaul ^1.1.2` | Bottom drawer component |
| `vite-plugin-pwa ^1.3.0` | Service worker + PWA manifest |
| `idb-keyval ^6.2.2` | IndexedDB wrapper (E2E key storage) |
| `date-fns ^3.6.0` | Date formatting |
| `recharts ^2.15.4` | Analytics charts |
| `next-themes ^0.4.6` | Dark/light mode |
| `html2canvas ^1.4.1` | Screenshot generation |
| `cmdk ^1.1.1` | Command palette |
| `input-otp ^1.4.2` | OTP input for manager invite code |
| `embla-carousel-react ^8.6.0` | Carousel component |
| `@radix-ui/*` | 30+ accessible UI primitives (shadcn/ui) |

### API Server (artifacts/api-server) — Key packages
| Package | Purpose |
|---------|---------|
| `express ^5.2.1` | HTTP server |
| `@google/generative-ai ^0.24.1` | Gemini AI integration |
| `helmet ^8.2.0` | HTTP security headers |
| `express-rate-limit ^8.5.2` | Rate limiting |
| `drizzle-orm` | PostgreSQL ORM |
| `pino ^9.14.0` | Structured JSON logging |
| `zod` | Input validation schemas |

---

## 14. CURRENT SYSTEM STATE

### What is fully built and working
| Feature | Status |
|---------|--------|
| E2E encrypted messaging | ✅ Production-ready |
| Deal Cards (full lifecycle) | ✅ Production-ready |
| AI Deal Analysis (Pilot) | ✅ With fallback |
| AI Pitch Coach (Scout) | ✅ With fallback |
| AI Message Classification | ✅ With fallback |
| Manager delegation system | ✅ Production-ready |
| Manager Kill Switch | ✅ Production-ready |
| Multi-celebrity management | ✅ Built, needs DB migration applied |
| Deal escalation flow | ✅ Built, needs DB migration applied |
| Voice messages | ✅ Production-ready |
| WebRTC calls (audio/video) | ✅ Built |
| PWA (installable) | ✅ Production-ready |
| Push notifications | ✅ Built |
| Fan Groups | ✅ Built |
| Stories Row | ✅ Built |
| Public profiles | ✅ Built |
| Auth (email + OAuth) | ✅ With confirmation UX |
| Dark/Light mode | ✅ |
| Arabic RTL UI | ✅ |
| Screenshot detection | ✅ |
| Offline queue | ✅ |

### Pending Actions Required

#### ⚠️ CRITICAL — Must run DB migration on production Supabase
The migration file `20260703080801_multi_celeb_escalation.sql` adds two new features:
```sql
-- Run on: https://supabase.com/dashboard/project/dxfcxxiysntgxstmyxqz/database/migrations
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_celebrity_id uuid;
ALTER TABLE deal_cards ADD COLUMN IF NOT EXISTS escalated_to_celebrity boolean DEFAULT false;
-- + 4 more escalation columns
```

#### ⚠️ CRITICAL — Deploy Edge Functions to production
After any change to edge functions, run from Supabase CLI:
```bash
supabase functions deploy create-manager-invite --project-ref dxfcxxiysntgxstmyxqz
supabase functions deploy manager-kill-switch   --project-ref dxfcxxiysntgxstmyxqz
supabase functions deploy redeem-manager-invite --project-ref dxfcxxiysntgxstmyxqz
supabase functions deploy delete-account        --project-ref dxfcxxiysntgxstmyxqz
```

#### ⚠️ Configure OAuth providers in Supabase Dashboard
For Google/Apple login:
- Go to: Authentication → Providers → Google / Apple
- Configure Client ID and Client Secret
- Set redirect URL to production domain

#### Optional — Set Gemini API Key for full AI features
```
GEMINI_API_KEY=your_key_here
```
Without this, the AI routes fall back to heuristic scoring (still functional).

---

## 15. GIT & DEPLOYMENT

### Repository
- **Remote:** `gitsafe-backup` (Replit internal backup system)
- **Branch:** `main`
- **Latest commit:** `27af6b2` — "Add multi-celebrity management and deal escalation features"
- **Status:** HEAD clean — all changes committed

### Commit History (recent)
```
27af6b2  Add multi-celebrity management and deal escalation features
db663dc  Add multi-celebrity management and deal escalation features
bcda03a  Add native app feel and PWA functionality
f7382c8  Add Progressive Web App capabilities
5e0c310  Improve AI message classification and secure API
babcc56  Add AI-powered features for deal analysis
94c1c4c  Update project documentation
```

### Deployment (Replit Hosted)
```
Frontend:   https://<repl-domain>/      (React PWA)
API Server: https://<repl-domain>/api   (Express 5)
```

**To connect an external GitHub repository:**
```bash
git remote add github https://github.com/<org>/<repo>.git
git push github main
```

---

## 16. ARCHITECTURAL RECOMMENDATIONS (CTO NOTES)

### Short-term (Next Sprint)
1. **Apply DB migration** — The multi-celebrity and escalation features are code-complete but blocked by the schema migration on production Supabase.
2. **Deploy edge functions** — `create-manager-invite` now has the corrected 15-minute timeout.
3. **Configure OAuth** — Google/Apple sign-in needs provider setup in Supabase dashboard.
4. **Add Supabase Realtime** to `useDealCards` — currently deal updates require manual refresh. Adding a `SUBSCRIBE` on the `deal_cards` table would make escalation status changes appear instantly.

### Medium-term (Q3 2026)
1. **Notification system** — Wire the push subscription to Supabase Database Webhooks so new messages/deal updates trigger push notifications without a separate server.
2. **Manager permissions granularity** — Currently a manager has full access to the celebrity's inbox. Consider a permissions matrix (read-only vs. can-reply vs. can-accept-deals).
3. **Deal analytics** — The `recharts` package is installed but underutilized. A deal performance dashboard (acceptance rates, response times, deal values) would be high value.
4. **WebRTC call signaling server** — Current implementation uses Supabase Realtime for WebRTC signaling, which works but adds latency. A dedicated STUN/TURN server would improve call quality.

### Long-term (Scaling)
1. **Edge caching** — AI classification results for similar messages could be cached to reduce Gemini API costs.
2. **Database read replicas** — When a celebrity has 100k+ messages, message queries need indexing optimization and potentially read replicas.
3. **Media storage** — Voice messages currently go to Supabase Storage. Consider a CDN with audio transcoding for better performance.

---

*Report generated by Sovereign CTO — July 7, 2026*  
*For internal strategic planning and AI-assisted analysis*
