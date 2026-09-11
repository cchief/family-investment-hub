# FAMILY INVESTMENT HUB
*Save consistently. Grow together.*

A private, secure, mobile-friendly portal for managing a family investment fund: monthly member contributions, admin verification, UAP Umbrella Trust Fund transfers, interest allocation, balances, and director-ready reporting.

This is a functional MVP — real authentication, a real (file-backed) database, real CRUD, file upload, and PDF reporting. No mock data screens.

---

## 1. Quick start

```bash
npm install
npm run db:seed     # creates dev.db and loads 1 admin + 8 members + 6 months of history
npm run dev          # http://localhost:3000
```

Demo logins (from the seed data):

| Role   | Email                | Password    |
|--------|-----------------------|-------------|
| Admin  | admin@family.com       | Admin123!   |
| Member | sarah@family.com       | Member123!  |
| Member | grace / peter / david / ruth / samuel / esther / joseph @family.com | Member123! |

To wipe and reseed at any point: `npm run db:reset`.

Production build check: `npm run build` (verified clean — see §7).

---

## 2. Architecture

**Stack:** Next.js 14 (App Router, TypeScript) · Node's built-in `node:sqlite` · NextAuth v4 (credentials + JWT) · Tailwind CSS · Recharts · `@react-pdf/renderer` · Zod.

**Why `node:sqlite` instead of Prisma/Postgres:** the build environment blocks binary downloads (Prisma's query engine, Postgres drivers with native bindings). Node 22 ships an experimental built-in SQLite driver that needs no native binary. The data layer is isolated behind `lib/db.ts` and a `lib/repo/*` repository layer with a fixed call shape (`one`, `all`, `run`, `withTransaction`), so swapping in Postgres later (recommended once this leaves the sandbox — see §8) means rewriting that one file, not the application.

**Layers:**
- `lib/schema.sql` — the single source of truth for the relational model.
- `lib/db.ts` — connection + `one/all/run/withTransaction` primitives. Rows are always spread into plain objects before being returned, so they can safely cross the Server→Client Component boundary.
- `lib/ledger.ts` — the only place balances are computed (see §4).
- `lib/repo/*` — one file per domain (members, contributions, fund, notifications, documents, settings, dashboard, memberStats) — all business rules live here, never in route handlers or pages.
- `lib/audit.ts` — the single `logAudit()` writer for the append-only audit log.
- `lib/session.ts` — `requireUser/requireAdmin/requireMember` guards, used at the top of every protected page and API route.
- `middleware.ts` — Edge-runtime coarse gate (redirects unauthenticated users, blocks non-admins from `/admin/*`) using only the JWT cookie, since Edge cannot reach `node:sqlite`. Fine-grained checks happen server-side per page/route.
- `app/(member)/*`, `app/admin/*`, `app/api/*` — pages and route handlers.

---

## 3. Data model (14 tables, ledger-first)

`users` → `members` (1:1) · `monthly_commitments` (per-member-per-month expected amount override) · `documents` (metadata only; files live outside `/public`, served through an authenticated route) · `contributions` (submission → verification workflow) · `contribution_evidence` (join) · `fund_valuations` (monthly close, lockable) · `interest_allocations` · `fund_transfers` (UAP) · **`transactions`** (the ledger) · `notifications` · `audit_logs` · `system_settings`.

**Ledger-first rule:** there is no `balance` column anywhere. Every financial fact — an approved contribution, an interest allocation, a withdrawal, an opening balance, a correction — is one immutable row in `transactions`. Every balance shown anywhere in the app (member dashboard, admin fund total, PDF report, CSV export) is a `SUM(amount)` query over that table, scoped by `member_id`, date range, or both. This is what makes the numbers reconcile *by construction* rather than by hope — there is no second place a balance could drift out of sync with the transaction history.

---

## 4. Balance & interest calculation logic

- **Member balance** = `SUM(transactions.amount WHERE member_id = X)`. Split into **principal** (`type = 'CONTRIBUTION' or 'OPENING_BALANCE'`) and **interest** (`type = 'INTEREST_ALLOCATION'`) for display.
- **Fund total** = `SUM(transactions.amount)` across everyone — always equals the sum of every member's individual balance (verified live, see §7).
- **Interest allocation**, run once per closed month, supports two pluggable methods (`lib/repo/fund.ts`):
  - **Proportional** — splits `interest_earned` across active members by each member's balance *as it stood strictly before that month's own postings* (contributions/interest dated that month are excluded from the split base), so a contribution never earns interest for a period before it existed. Falls back to an equal split if nobody has any prior balance (e.g. month 1). Rounding remainder is absorbed by the last member so the allocation always sums exactly to `interest_earned`.
  - **Manual** — the admin enters an amount per member; the system validates the total against `interest_earned` (small rounding tolerance) before allowing it to post.
  - Either way, allocating posts one `INTEREST_ALLOCATION` transaction per member inside a single DB transaction (`withTransaction`), and the whole month is rejected up front if it has already been allocated — no silent double-posting.
- **Fund valuation "lock":** once an admin locks a month's valuation, `recordFundValuation()` refuses further edits and throws, directing the admin toward an explicit correction path rather than a silent overwrite.

---

## 5. Contribution verification workflow

1. Member submits a contribution (amount, date, method, reference, ≥1 proof file) → row created as `PENDING_VERIFICATION`. **Uploading a file never approves anything** — this is enforced in `submitContribution()`, not just in the UI (verified live in §7).
2. Admin reviews it on `/admin/verification` against the uploaded evidence.
3. **Approve** → posts one `CONTRIBUTION` transaction to the ledger, contribution becomes `APPROVED`. Amounts outside the configured min/max band require a typed override reason, which is stored and audit-logged.
4. **Reject** → contribution becomes `REJECTED` with a reason; the member must submit a fresh contribution (history of the rejected one is kept, never deleted).
5. Duplicate payment references are flagged (`possible_duplicate`) for the admin's attention but never hard-blocked, since legitimate shared/joint references happen.

---

## 6. Security & audit controls

- Passwords hashed with bcrypt; sessions are short-lived (8h) signed JWTs.
- Route-level RBAC: Edge middleware for coarse gating, `requireAdmin`/`requireMember` for fine-grained checks in every page and API route — a member can never query another member's data because repo functions that return personal data take the *session's own* `memberId`, not a client-supplied one.
- Uploaded documents are stored outside `/public` and served only via `/api/documents/[id]`, which re-checks the session and, for non-admins, joins back to confirm the document belongs to that member's own contribution evidence before streaming it.
- No banking credentials, PINs, or OTPs are ever collected or stored — the app tracks *that* a transfer/contribution happened and its reference, never how to access the account.
- Nothing is auto-approved and nothing moves money automatically; every ledger-affecting action is an explicit admin action.
- All financial mutations, approvals, rejections, overrides, valuations, lockings, allocations, and transfers write an `audit_logs` row (actor, action, entity, before/after JSON, timestamp) through the single `logAudit()` function — there is no other write path to that table, and the app never issues `UPDATE`/`DELETE` against it.
- Historical transactions are never deleted, including when a member is marked `INACTIVE` — inactive members simply stop appearing in "expected this month" totals.

---

## 7. Verification performed before delivery

Run against the freshly seeded database in this sandbox:

- `npm run build` — clean production build, zero errors (three build-blocking bugs found and fixed: a `UNION ALL … ORDER BY` ambiguity, `node:sqlite`'s null-prototype rows breaking Server→Client Component serialization, and a missing Suspense boundary around `useSearchParams()` on `/login`).
- Ledger reconciliation: `SUM(all transactions)` vs. `SUM(each member's individual balance)` on the seeded data — **9,985,000 = 9,985,000 ✓**.
- Live smoke test with the dev server running: admin login → session cookie issued with correct role/memberId; every admin page (`/admin`, verification, members, collections, UAP fund, interest allocation, reports, documents, audit trail, settings) returns 200 with no error markers; member login → every member page (dashboard, balance, contributions, fund performance, statements, profile, notifications, documents) returns 200 clean.
- Full contribution lifecycle exercised live end-to-end: member submitted a contribution with a photo attached → confirmed status was `PENDING_VERIFICATION` (not auto-approved) → admin approved it via the API → confirmed status flipped to `APPROVED` and exactly one ledger transaction was posted for the correct amount → reconciliation re-checked and still balanced (10,185,000 = 10,185,000 ✓) → confirmed `CONTRIBUTION_SUBMITTED` and `CONTRIBUTION_APPROVED` rows appeared in the audit log.
- PDF monthly report generation exercised live via the actual API route — returned a valid single-page PDF document.
- The database was reset to the clean seed state after this test run, so the copy you're receiving has only the original seed data (6 months, Apr–Sep 2026), not the smoke-test contribution.

---

## 8. Known simplifications / next steps (intentionally out of scope for this MVP)

- **Database engine:** `node:sqlite` is fine for this sandbox and for local testing, but is still experimental. Before real money/real families depend on this, migrate `lib/db.ts` to Postgres (the repo layer above it does not need to change).
- Correction-with-reason UI for locked fund valuations is designed for (the lock throws rather than silently overwriting) but the actual correction form isn't built yet.
- Notifications are in-app only (by design, per the brief) — channel field exists on the schema for Email/WhatsApp/SMS to be added later without a schema change.
- No bank-statement import, OCR, or loan module — the schema and repo pattern are structured so these can be added as new tables/repo files without touching the ledger core.
