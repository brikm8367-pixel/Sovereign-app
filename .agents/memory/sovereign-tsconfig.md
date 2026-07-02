---
name: Sovereign tsconfig strict flags
description: TypeScript compiler flags that must be disabled in sovereign to avoid base tsconfig conflicts
---

**Rule:** `artifacts/sovereign/tsconfig.json` must explicitly disable these flags even though `tsconfig.base.json` enables them:
- `strictPropertyInitialization: false`
- `strictNullChecks: false`
- `noImplicitThis: false`
- `alwaysStrict: false`
- `useUnknownInCatchVariables: false`
- `noImplicitReturns: false`
- `noImplicitAny: false`
- `strict: false`

**Why:** The codebase from Lovable uses extensive `as any` casts, optional chaining on Supabase dynamic tables, and patterns that don't work under strict TypeScript. `strictPropertyInitialization: true` (inherited from base) conflicts with `strictNullChecks: false` and causes TS5052. All strict flags must be turned off at the artifact level.

**How to apply:** Never enable strict flags in sovereign's tsconfig without auditing all Supabase `(supabase as any).from(...)` usages first.
