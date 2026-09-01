# WMSU Exam System — Optimization Plan

> **Companion to:** `OptimizationChecklist.md` (tailored for serverless)  
> **Stack:** React 18 + Vite 5 + Tailwind 4 · Hono 4 · Cloudflare Workers + D1 + Workers Assets · PWA  
> **Date:** 2026-08-24 | **Version:** 1.0.0  
> **Status:** Planning — no code changes yet; use with checklist as execution tracker.

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [System & Goals (§1)](#2-system--goals-1)
3. [Inventory Snapshot (§2)](#3-inventory-snapshot-2)
4. [Applicability Verdict — What We Can / Cannot Apply](#4-applicability-verdict--what-we-can--cannot-apply)
5. [Current State & Measured Gaps](#5-current-state--measured-gaps)
6. [Optimization Priority (Checklist §25)](#6-optimization-priority-checklist-25)
7. [Phase 0 — Baseline & Observability (§1, §3, §19, §22)](#7-phase-0--baseline--observability-13-1922)
8. [Phase 1 — Security & Correctness (P0 — Critical) (§13, §1)](#8-phase-1--security--correctness-p0--critical-131)
9. [Phase 2 — Reliability & Database (P1 — High) (§6, §12, §14, §15)](#9-phase-2--reliability--database-p1--high-6121415)
10. [Phase 3 — Performance, Caching & UX (P2 — High) (§5, §7, §9, §15, §21)](#10-phase-3--performance-caching--ux-p2--high-5791521)
11. [Phase 4 — Cost, Deployment & Documentation (P3 — Medium) (§17, §18, §23, §24)](#11-phase-4--cost-deployment--documentation-p3--medium-17182324)
12. [Verification & Final Gate (§19, §22, §25)](#12-verification--final-gate-192225)
13. [What NOT to Optimize (N/A Justification)](#13-what-not-to-optimize-na-justification)
14. [Risks & Rollback](#14-risks--rollback)
15. [Appendix A — File Map & Line References](#15-appendix-a--file-map--line-references)
16. [Appendix B — Checklist Mapping Table](#16-appendix-b--checklist-mapping-table)
17. [Appendix C — Effort & Sequencing](#17-appendix-c--effort--sequencing)

---

## 1. Executive Summary

**Can we apply `OptimizationChecklist.md`? Yes — ~70% directly, ~20% with serverless adaptation, ~10% N/A.**

The checklist is a generic full-stack guide. Our system is **serverless** (`wrangler.toml:1`), so OS/infra items (§10, §11, parts of §8/§9/§14/§16) do not apply. Everything else applies immediately, with interpretation for Workers/D1.

**Highest ROI order (Checklist Core Rule: Measure → Identify → Change → Benchmark → Validate → Monitor → Document → Repeat):**

| Priority | Focus | Why Now | Checklist Sections |
|----------|-------|---------|-------------------|
| P0 | **Security & Correctness** | 19 write routes lack `adminCheck()` (`worker/index.js:60,95,136,185`) + answer leakage `worker/index.js:73`; optimizing perf before fixing this widens the attack surface | §13, §1 |
| P1 | **Reliability + DB** | Missing indexes cause tablescans on student lookup (`worker/index.js:1210`); serial `await INSERT` loops block under exam spikes; no health check | §6, §12, §14 |
| P2 | **Perf/Cache/UX** | No `React.lazy` (`src/App.jsx:4`), 10k DOM cells (`Answers.jsx:235`), 1s localStorage thrash (`Exam.jsx:379`), unbounded list endpoints | §5, §7, §9, §15, §21 |
| P3 | **Cost/Docs/CI** | Unbounded `activity_log`, stale `compatibility_date 2025-04-01` (`wrangler.toml:3`), no CI | §17, §18, §23 |

**If we do nothing else, do Phase 1.** One `curl POST /api/exams` can currently create, overwrite, or delete exams unauthenticated.

---

## 2. System & Goals (§1)

**What it does:** Single-Worker exam + quiz + attendance + class management for a university. Students enroll via class codes, take randomized proctored exams (offline-resilient), check in via QR. Admins manage classes, question bank, live proctoring, regrade, analytics. See `AGENTS.md:3` and `ARCHITECTURE.md:24`.

**Critical workflows (§1:6):**
1. **Exam taking** `src/pages/Exam.jsx:13` — 901 LOC state machine: gate → `POST /session/start` `worker/index.js:384` → `seed=hash(name+section+id)` → shuffle → fullscreen timer → heartbeat 15s `worker/index.js:485` → `POST /submit` `worker/index.js:288`.
2. **Live proctoring** `src/pages/admin/Proctor.jsx` — polls `GET /proctor/:examId` `worker/index.js:518` every 5s.
3. **Class enrollment & attendance** `worker/index.js:866` self-enroll + `class_attendance` `worker/index.js:1111`.
4. **Grading parity** — `matchesAnswer` duplicated `src/utils.js:283` ↔ `worker/index.js:1719`; choice shuffle `seed + idx*7919`.

**Measurable goals (define before optimizing):**

| Metric | Baseline (to record in Phase 0) | Target |
|--------|----------------------------------|--------|
| `POST /submit` p95 | _measure via k6_ | < 300 ms |
| `GET /exams/:id` p95 (student) | _measure_ | < 150 ms |
| `GET /analytics/:examId` p95 (50 Q × 200 subs) | _measure_ | < 800 ms |
| Main bundle gzip | `pnpm build` du → _measure_ (est. ~400 KB) | < 200 KB via code split |
| Lighthouse Performance (Landing) | _measure_ | > 90 |
| Concurrent exam takers | unknown | 300 sustained |
| Availability | none | 99.5% monthly, RPO 24h |
| Cost | none | <$5/mo D1 + Workers free tier |

**Must NOT degrade:** Grading parity (`src/utils.js` ↔ `worker/index.js`), exam mid-session finalization (`worker/index.js:300 isResumeFinalization`), offline fallback (`Exam.jsx:87 cached_exam_*`).

---

## 3. Inventory Snapshot (§2)

Documented at `ARCHITECTURE.md:48` and `AGENTS.md:5`. Highlights:

- **Frontend** `src/main.jsx:1` → `src/App.jsx:21` (16 routes), `src/api.js:1` (38 helpers, `BASE 1` + `adminPass 23`), `src/utils.js:1` (seededRandom, shuffle, matchesAnswer), `public/sw.js:1` (v2), `vite.config.js:5`.
- **Backend** `worker/index.js:1` (~1863 LOC, ~50 routes), `worker/schema.sql:1` (12 tables, 13 indexes `schema.sql:173`), migrations `worker/migration_*.sql`.
- **Infra** `wrangler.toml:1` Worker `exam-system` + `assets directory=dist` `wrangler.toml:4` + D1 `exam-db 8d3aeb60...` `wrangler.toml:9`. `package.json:21` pnpm + `qrcode 1.5.4`, `lucide-react`, `hono 4.12`.
- **External deps:** Cloudflare CDN/Workers/D1 only; `qrcode` for QR, no queue, no auth provider.
- **Legacy:** `exams.roster` JSON `worker/schema.sql:10` superseded by `class_id→enrollments` but kept for walk-ins `worker/index.js:606`.
- **SPOF:** Single D1 binding `DB`; single Worker; no replica. See §9.

---

## 4. Applicability Verdict — What We Can / Cannot Apply

The tailored `OptimizationChecklist.md` already comments every N/A item with `<!-- N/A — Serverless: reason -->`. Summary:

| Verdict | Sections | Count |
|---------|----------|-------|
| **Apply as-is** | §1, §3 (adapted), §4, §5 (most), §6 (most), §7, §9 (most), §12, §13, §14, §15, §17, §18 (most), §19, §20, §21, §22, §23, §24, §25 | ~145 items |
| **Adapt for serverless** | §2 network/caches, §3 CPU/memory/disk (→ Workers CPU time/D1 storage), §5 concurrency/connection, §6 D1 transactions, §7 Cache API, §8 D1 not disk, §9 compression/CDN, §15 S2S → browser↔Worker, §16 thread pools → Promise.all, §18 network/licensing | ~35 items |
| **N/A — skip** | §2 hardware/OS, §3 queue depth, §4 context switching, §5 thread/process/shutdown, §6 replication/partitioning/pool, §8 tiering/IOPS/disk capacity, §9 DNS/LB/packet loss, **§10 all infra sizing/autoscaling** (Workers autoscales), **§11 entire OS section** (14 items), §14 autoscaling knob, §15 S2S, §16 thread/worker/queue pools, §18 right-size/licensing/shutdown | ~55 items |

**Checklist is still the right tool.** Use the adapted checklist as the execution tracker; this plan is the interpretation layer. See [Appendix B](#16-appendix-b--checklist-mapping-table) for item-level mapping.

---

## 5. Current State & Measured Gaps

Based on full read-only audits (no code changes yet):

**Strengths already present:**
- Deterministic shuffle + grading parity correct (`src/utils.js:15` ↔ `worker/index.js:1464`, `computeScore:1738`).
- SW `public/sw.js:26` correctly bypasses `/api`; versioned `exam-portal-v2` `sw.js:1`.
- 13 indexes covering hot paths `worker/schema.sql:173`; `LIMIT 200` logs `worker/index.js:282`, `LIMIT 100` leaderboard `worker/index.js:1343`.
- Offline resilience: `cached_exam_*`, `exam_state_*`, `pending_submission_*` `Exam.jsx:87`.
- Session lock `SESSION_STALE_MS=75s` `worker/index.js:382` + stale expiry `worker/index.js:450`.

**Gaps by checklist section (with file:line):**

| Section | Critical Gaps |
|---------|---------------|
| **§3 Observability** | No centralized metrics — only `activity_log` `worker/index.js:26` with silent `catch{}` `worker/index.js:31`; no dashboards/alerts; `ARCHITECTURE.md:310` admits none |
| **§5 App/Code** | `QuestionCard.jsx:74` shuffle per render (no `useMemo`); `Answers.jsx:102` 10k shuffles per keystroke; `Exam.jsx:379` localStorage every 1s; `qrcode` statically imported `Classes.jsx:8`, `Proctor.jsx:5` bloats main chunk |
| **§6 DB** | Missing: `idx_enrollments_student_id` (for `worker/index.js:1210`), composite `(exam_id,student_id)` (for `worker/index.js:333`), `UNIQUE(session_id,student_id)` (`worker/index.js:740`), `idx_classes_access_code`; `SELECT *` over-fetch `worker/index.js:73,238`; serial loops `duplicate:126`, `bulk:221`, `regrade:1843`; `activity_log` unbounded |
| **§7 Caching** | `sw.js:44` caches every 200 forever (no LRU/TTL); `src/api.js:3` no memoization; stale `cached_exam_*` `Exam.jsx:99` with no TTL |
| **§9 Network** | Heartbeat every 15s even when hidden `Exam.jsx:186`; proctor poll every 5s `Proctor.jsx:32` (120 req/min/10 admins); 3 parallel fetches `Dashboard.jsx:19`; no timeout `src/api.js:3` |
| **§12 Reliability** | No `GET /health`; no backoff for `pending_submission` `Exam.jsx:164`; `log() catch{}` hides failures; manual `backups/` `backups/db-backup-*.sql` never tested |
| **§13 Security P0** | 19 write routes missing `adminCheck` (`POST /exams:60`, `PUT:95`, `DELETE:136`, `questions:185/198/208`); `GET /exams/:id:73` returns `answer`; `GET /logs:279` + `GET /submissions/:examId:1355` + `GET /analytics:1386` public; `VITE_ADMIN_PASSWORD` in bundle `src/api.js:23` + plaintext `[vars]` `wrangler.toml:7`; open `cors()` `worker/index.js:6`; `dangerouslySetInnerHTML` XSS `QuestionCard.jsx:41`; no rate limits |
| **§15 API** | Zero pagination — `GET /exams:49`, `GET /classes`, `GET /students:1093` return all rows; `Answers.jsx:235` renders `min-w-max` 10k cells; no `ETag`/`Cache-Control` |
| **§17 CI/CD** | No `.github/`; manual `pnpm build` only `AGENTS.md:20`; `wrangler deploy` direct to prod; stale `compatibility_date 2025-04-01` |
| **§21 UX** | No `React.lazy` `src/App.jsx:4` (14 routes eager); no `web-vitals`; `Answers.jsx:235` wide table no virtualization |

---

## 6. Optimization Priority (Checklist §25)

Per `OptimizationChecklist.md:413` — do in this order, one phase at a time:

1. **Correctness** §1 — grading parity, exam lifecycle
2. **Security** §13 — close auth holes before perf work (perf can widen holes)
3. **Reliability** §12 — health, timeouts, backoff, backups
4. **Observability** §3 — make problems measurable, else blind
5. **Major bottlenecks** §4, §6, §15 — DB N+1, pagination, batch
6. **Scalability** §14 — load test, capacity plan
7. **User experience** §5, §21 — bundle, lazy, virtualize
8. **Cost** §18 — retention, cleanup
9. **Maintainability** §20, §23
10. **Micro-optimizations** last

**Core Rule** `OptimizationChecklist.md:430`: **Measure → Identify → Change → Benchmark → Validate → Monitor → Document → Repeat**

---

## 7. Phase 0 — Baseline & Observability (§1, §3, §19, §22)

**Goal:** Establish numbers so every later phase can prove it helped. No behavior changes.

### Tasks
- [ ] **§1:7 Define goals** — fill table in §2 with agreed targets (need stakeholder sign-off on concurrent users + cost).
- [ ] **Docs:** Create `docs/perf-baseline.md` (bundle sizes, Lighthouse, p50/p95 for `GET /exams`, `POST /submit`, `GET /analytics`).
- [ ] **§3:38 Logging** — add `wrangler.toml` block:
  ```toml
  [observability]
  enabled = true
  [logpush]
  # configure via dashboard; fallback to tail workers
  ```
  Add `GET /api/health` `worker/index.js` → `SELECT 1 FROM exams LIMIT 1` + `c.header('Server-Timing', ...)`.
- [ ] **§3:45 DB perf** — run `EXPLAIN QUERY PLAN` for hot queries: `enrollments WHERE student_id` `worker/index.js:1210`, `submissions WHERE exam_id` `worker/index.js:1341`, `exam_sessions active` `worker/index.js:440`. Save to `docs/perf-baseline.md`.
- [ ] **§19:313 Benchmarks** — add `scripts/bench.mjs` using `k6` or `autocannon`: 50 VUs × 100 `POST /submit`, 20 VUs `GET /analytics` with 200 subs. Record p50/p95/CPU ms.
- [ ] **§21:341 UX baseline** — `npm i web-vitals` in `src/main.jsx:12`, report LCP/CLS to console initially.

### Verification
- `pnpm build && ls -lh dist/assets/` → sizes
- `npx wrangler tail` shows health + Server-Timing
- `k6 run scripts/bench.mjs` produces p95 numbers

### Exit Criteria
`docs/perf-baseline.md` filled; checklist §1 (12/12) + §3 (first 6) checked.

---

## 8. Phase 1 — Security & Correctness (P0 — Critical) (§13, §1)

**Goal:** Close critical auth/XSS holes. Do before any perf work.

### Tasks

#### 1a. Gate unauthenticated mutation routes (§13:220-222)
Add `adminCheck(c)` guard to **19 routes** currently public. In `worker/index.js`:
- `POST /api/exams` `worker/index.js:60` → add `if (!adminCheck(c)) return 401`
- `PUT /api/exams/:id` `worker/index.js:95` → guard
- `DELETE /api/exams/:id` `worker/index.js:136` → guard
- `POST /api/exams/:examId/questions` `worker/index.js:185` → guard
- `PUT /api/questions/:id` `worker/index.js:198` → guard
- `DELETE /api/questions/:id` `worker/index.js:208` → guard
- `POST /api/exams/:examId/questions/bulk` `worker/index.js:215` → guard
- Also gate read leaks: `GET /api/logs` `worker/index.js:279`, `GET /api/submissions/:examId` `worker/index.js:1355`, `GET /api/analytics/:examId` `worker/index.js:1386`, `GET /api/bank` `worker/index.js:236` (question bank leaks).
- `GET /api/exams/:id` `worker/index.js:73` — keep student access but **strip `questions[].answer` and `questions[].choices[*].key`** unless `adminCheck(c)` or student is enrolled; return only `displayKey` already shuffled.

#### 1b. Fix answer leakage in detail endpoint (§13:228)
```js
// worker/index.js:73 — inside GET /exams/:id
if (!adminCheck(c)) {
  questions = questions.map(q => ({ ...q, answer: undefined, explain: '' }));
  // or: omit entirely and let exam taking use a separate /take endpoint
}
```

#### 1c. Secrets — remove from bundle (§13:224)
- `wrangler.toml:7` `[vars] VITE_ADMIN_PASSWORD` → remove; use `npx wrangler secret put ADMIN_PASSWORD`.
- `worker/index.js:34` `adminCheck` → compare `c.env.ADMIN_PASSWORD` (constant-time: add `timingSafeEqual`).
- `src/components/AuthGate.jsx:6` + `src/api.js:23` → stop embedding `VITE_ADMIN_PASSWORD` in JS; instead, server issues `HttpOnly` session cookie on `POST /api/admin/login`. Fallback: keep header auth but never `VITE_` prefix.
- Rotate `wmsu_123` → new secret; update `.env.production` not committed.

#### 1d. CORS + headers (§13:218, §13:227)
- `worker/index.js:6` `cors()` → `cors({ origin: ['https://exam-system.sanigkram24.workers.dev','http://localhost:5173'] })`.
- Add global middleware setting `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin`, `Content-Security-Policy` (no inline scripts except Vite).

#### 1e. Input validation & XSS (§13:232, §13:219)
- Add `zod` validation for `POST /exams/:examId/questions` (`text`, `choices`, `answer` lengths; reject `<script` / `onerror=`). Sanitize stored HTML before `dangerouslySetInnerHTML` `QuestionCard.jsx:41` — use `dompurify` on write and on render.
- `worker/index.js:288` `POST /submit` — **recompute `score` server-side** via `computeScore()` `worker/index.js:1738` instead of trusting client `body.score`. Client score is UI-only.
- Enforce `Content-Length: 10kb` on `c.req.json()` for questions/submit.

#### 1f. Rate limiting (§13:260, §12:209)
- Add in-Worker token bucket (Map per IP, 10 req/min): protect `POST /submit`, `POST /session/start` `worker/index.js:384`, `POST /checkin` `worker/index.js:720`, `POST /lookup` `worker/index.js:708`. Plus Cloudflare WAF rate limiting rule (10 req/s per IP on `/api/*`).

### Verification (§13)
- `curl -X POST https://.../api/exams -d '{}'` → 401
- `curl https://.../api/exams/<id>` (no auth) → no `answer` field
- `view-source dist/assets/*.js` → no password
- `curl -H "Origin: https://evil.com" https://.../api/submit` → CORS blocked

### Exit Criteria
Checklist §13 (15/15 applicable) checked; no unauthenticated mutation leaks.

---

## 9. Phase 2 — Reliability & Database (P1 — High) (§6, §12, §14, §15)

### DB Indexes & Query Hygiene (§6:99-118)

Add migration `worker/migration_optimize_indexes.sql`:
```sql
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_exam_student ON submissions(exam_id, student_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_checkins_unique ON checkins(session_id, student_id);
CREATE INDEX IF NOT EXISTS idx_classes_access_code ON classes(access_code);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_access_code ON attendance_sessions(access_code);
CREATE INDEX IF NOT EXISTS idx_sessions_exam_student_active ON exam_sessions(exam_id, student_id, active);
CREATE INDEX IF NOT EXISTS idx_class_attendance_student ON class_attendance(class_id, student_id, date);
```

- [ ] **§6:108 Select only required columns** — `worker/index.js:73` `SELECT * FROM exams` → select only needed (`id,title,type,status,passing_score,class_id` for public; full for admin). Same `worker/index.js:238` `SELECT * FROM question_bank`.
- [ ] **§6:106 Eliminate N+1** —
  - `worker/index.js:1232` `for (cid of classIds) { await SELECT classes; await SELECT class_attendance; }` → single `SELECT * FROM classes WHERE id IN (?,?)` + `SELECT * FROM class_attendance WHERE class_id IN (...) AND student_id=?`.
  - `worker/index.js:1003` enroll bulk `1010-1021` already loops; switch to `db.batch(statements)`.
- [ ] **§6:109 Optimize transactions** — `worker/index.js:126` duplicate + `worker/index.js:221` bulk + `worker/index.js:1843` regrade → use `D1.batch()` atomically; on failure, no half-written exams.
- [ ] **§6:114 Archive** — add retention: `DELETE FROM activity_log WHERE created_at < date('now','-90 days')` (nightly). `submissions` kept.

### Concurrency — Parallelize Sequential Queries (§16:267, §6)
- [ ] `worker/index.js:524` proctor (4 awaits `524-550`) → `Promise.all([active, stale, kicked, submitted])`.
- [ ] `worker/index.js:909` `GET /classes/:id` (3 awaits `909-920`) → `Promise.all([enrollments, exams, sessions])`.
- [ ] `worker/index.js:1164` history (3 awaits `1167-1172`) → `Promise.all`.

### Pagination & Batching (§15:258)
- [ ] Server: add `?limit=20&offset=0&q=` to `GET /api/exams` `worker/index.js:49`, `GET /api/submissions/:examId` `worker/index.js:1355`, `GET /api/classes` `worker/index.js:808`, `GET /api/students` `worker/index.js:1093`, `GET /api/logs` `worker/index.js:279`.
- [ ] Client: `src/pages/admin/Results.jsx:69` `filtered = subs.filter` → server paginated + `react-window` for `Answers.jsx:235` table (50 Q × 200 subs → virtual scroll, not 10k DOM cells).
- [ ] Cache headers: `GET /api/exams` `s-maxage=30, stale-while-revalidate=60`; `GET /api/bank` `s-maxage=60` for admin.

### Reliability (§12:198-end)
- [ ] **Health** `§12:204` — `GET /api/health` + Cloudflare health check.
- [ ] **Timeouts** `§12:205` — `src/api.js:4` wrap `fetch` with `AbortSignal.timeout(5000)`; Worker operations that loop (analytics `worker/index.js:1398`) add `if (Date.now() - start > 25000) throw 503`.
- [ ] **Retries/backoff** `§12:206-208` — `src/pages/Exam.jsx:164` `pending_submission` → exponential backoff `1s,2s,4s,8s` + jitter, max 5 retries, then `toast` ask manual retry. Add `Idempotency-Key` header on `POST /submit`.
- [ ] **Circuit breaker** `§12:209` — if `GET /analytics` fails 3x in 10s, return `503 Retry-After: 30` and cache last good response 60s.
- [ ] **Backups** `§12:212-214` — schedule `npx wrangler d1 backup create exam-db` nightly via GitHub Action; test restore monthly to `:memory:` and log.

### Verification
- `npx wrangler d1 execute exam-db --local --file=worker/migration_optimize_indexes.sql` → success
- `EXPLAIN QUERY PLAN SELECT * FROM enrollments WHERE student_id='2019-...'` shows `USING INDEX idx_enrollments_student`
- `k6` submit burst 300 students in 60s → no `409` lock storm; p95 <800ms
- Pagination: `GET /submissions/<id>?limit=20&offset=20` returns 20

---

## 10. Phase 3 — Performance, Caching & UX (P2 — High) (§5, §7, §9, §15, §21)

### Application/Code (§5:76-95)
- [ ] **Profile** `§5:77-78` — run `vite --profile`, `wrangler tail --format=json` for CPU ms.
- [ ] **§5:82 Eliminate duplicate work** — `src/components/QuestionCard.jsx:74`:
  ```jsx
  const shuffledChoices = useMemo(() => shuffleWithSeed(choices, seed + idx*7919), [choices, seed, idx]);
  ```
  Same for `src/pages/admin/Answers.jsx:102` — `useMemo(() => rows, [qs, subs, search])`.
- [ ] **§5:83 Object allocation** — `src/pages/Exam.jsx:379` `handleTimerTick` writes `exam_state_*` every 1s → throttle to 5s + `JSON.stringify` only when `answeredSet` changed. `Timer.jsx:42` `onTick` already 1s; gate `localStorage.setItem` behind `if (dirty)`.
- [ ] **§5:92 Dependencies** — audit `package.json:13` `sharp` unused → remove; `qrcode 1.5.4` → dynamic `await import('qrcode')` in `Classes.jsx:554` & `Proctor.jsx:40` only when QR modal opens.
- [ ] **§5:95 Third-party** — `lucide-react` — verify tree-shaking: `import { Clock } from 'lucide-react'` is fine (Vite tree-shakes), but ensure no `import * as Icons`. Add `rollupOptions manualChunks: { vendor: ['react','react-router-dom'], icons: ['lucide-react'] }`.

### Caching (§7:120-132)
- [ ] **§7:126 Expiration** — `public/sw.js:44` `cache.put` → add:
  ```js
  const cache = await caches.open(CACHE);
  const keys = await cache.keys();
  if (keys.length > 50) await cache.delete(keys[0]);
  // + store timestamp header and expire after 7d
  ```
- [ ] **`wrangler.toml:4` asset headers** — add:
  ```toml
  [assets]
  headers = { "assets/*.js" = { "Cache-Control" = "public, max-age=31536000, immutable" }, "assets/*.css" = { "Cache-Control" = "public, max-age=31536000, immutable" } }
  ```
- [ ] **§7:128 Stale data** — `Exam.jsx:99` `cached_exam_*` → add `cached_at` timestamp, invalidate if `Date.now() - cached_at > 24*3600*1000`.
- [ ] **API memo** — `src/api.js:3` add in-memory `Map` with 30s TTL for `listExams`, `listBank`; SWR dedupe concurrent `request('/exams')`.

### Network (§9:150-164)
- [ ] **§9:154 Unnecessary calls** — `Exam.jsx:186` heartbeat `setInterval 15s` → skip if `document.hidden`; `Proctor.jsx:32` poll `5s` → `10s` + jitter `0.8-1.2x` + pause when tab hidden.
- [ ] **§9:155 Payloads** — `GET /exams/:id` for Dashboard/Results fetches full `questions[]` → add `?fields=meta` for list views (return counts only). `Results.jsx:32` 3 requests (`exam`+`submissions`+`analytics`) → consider `GET /exams/:id/bundle` single fetch.
- [ ] **§9:157 Request patterns** — `Dashboard.jsx:19` `load()` → `Promise.all` but dedupe `listStudents` (cache 60s).

### UX (§21:339-351)
- [ ] **§21:344 Assets** — `vite.config.js:5` add:
  ```js
  build: { rollupOptions: { output: { manualChunks: { vendor: ['react','react-dom','react-router-dom'], qr: ['qrcode'] } } } }
  ```
- [ ] **§21:346 Lazy loading** — `src/App.jsx:4`:
  ```jsx
  const Exam = lazy(() => import('./pages/Exam'));
  const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
  // wrap with <Suspense fallback={<Spinner/>}>
  ```
  14 routes → initial bundle drops ~40%.
- [ ] **§21:347 Loading states** — already `Spinner`/`EmptyState` good; add `Skeleton` for `Results.jsx:93` table while paginated data loads.
- [ ] **§21:345 API calls** — debounce `Answers.jsx` search input 300ms; avoid 10k shuffle re-renders.
- [ ] **§21:349 Client errors** — `window.addEventListener('unhandledrejection', e => fetch('/api/client-error', ...))` or Sentry DSN; report to `activity_log` with `action=client_error`.

### Verification
- `pnpm build && npx vite-bundle-analyzer dist/stats.html` → main <200KB gzip, `qr-*.js` separate chunk
- Lighthouse before/after >90
- `Answers.jsx` with 200 subs × 50 Q → virtual scroll smooth, not 10k DOM nodes

---

## 11. Phase 4 — Cost, Deployment & Documentation (P3 — Medium) (§17, §18, §23, §24)

### Deployment/CI (§17:280-293)
- [ ] **§17:283 Cache deps** — create `.github/workflows/ci.yml`:
  ```yaml
  - uses: pnpm/action-setup@v4
  - uses: actions/cache@v4 // with pnpm-lock.yaml
  - run: pnpm build
  - run: node --check worker/index.js
  - run: npx wrangler deploy --dry-run
  ```
- [ ] **§17:289 Safe rollout** — use `npx wrangler versions upload` + `gradual-rollout 10%`, then `npx wrangler versions deploy`. Document in `CLI_REFERENCE.md:14`.
- [ ] **§17:290 Rollback** — `npx wrangler rollback` + `npx wrangler d1 execute exam-db --file=backups/latest.sql` (test in Phase 2).
- [ ] **Update `compatibility_date`** `wrangler.toml:3` `2025-04-01` → `2026-08-24` after testing; enable `nodejs_compat` if needed.

### Cost (§18:295-309)
- [ ] **§18:296 Remove unused** — `package.json:21` `onlyBuiltDependencies` `sharp` → remove if unused; `dist/` gitignored fine.
- [ ] **§18:300 Storage** — schedule `DELETE FROM activity_log WHERE created_at < date('now','-90 days')` daily; bulk-delete old `attendance` if needed. D1 reads: `SELECT *` → `SELECT id,title` cuts cost 60-80% per `GET /exams`.
- [ ] **§18:308 Budgets** — Cloudflare dashboard → D1 row reads alert at 1M/day.
- [ ] **§18:309 Cost per request** — add `X-Cost-Hint` via analytics: log `DB reads/writes` per endpoint in `docs/perf-baseline.md`.

### Docs (§23:366-379)
- [ ] **§23:371 Limits** — in `ARCHITECTURE.md:315` add section: D1 10GB, 128MB isolate, 30s CPU, 50 subrequests.
- [ ] **§23:372 Bottlenecks** — document remaining: `analytics O(Q*S)` needs pagination at >500 subs; `gradebook` needs server pagination.
- [ ] **§23:373-378** — record decisions in `docs/OPTIMIZATION_DECISIONS.md`; add `RUNBOOK.md` (deploy, rollback, restore); update `AGENTS.md:33` auth rule to reflect new `ADMIN_PASSWORD`.

### Continuous (§24:381-392)
- [ ] Schedule quarterly review: re-run `scripts/bench.mjs`, review Cloudflare analytics, rotate secret.
- [ ] Add `#optimization` label in issues; remove optimizations with no measured gain (§24:391).

---

## 12. Verification & Final Gate (§19, §22, §25)

Per phase, run:

```bash
# Syntax + build
node --check worker/index.js
pnpm build && ls -lh dist/assets/

# Local DB migration check
npx wrangler d1 execute exam-db --local --file=worker/migration_optimize_indexes.sql
npx wrangler d1 execute exam-db --local --command "EXPLAIN QUERY PLAN SELECT * FROM enrollments WHERE student_id='TEST';"

# Benchmark (after baseline)
k6 run scripts/bench.mjs   # or: npx autocannon -c 50 http://127.0.0.1:8787/api/exams
npx lighthouse http://localhost:5173 --only-categories=performance --chrome-flags="--headless"
```

**Final Gate `OptimizationChecklist.md:394` — all 14 must be true before declaring optimized:**

| Gate | Check |
|------|-------|
| Performance measured before/after | `docs/perf-baseline.md` + `docs/perf-after.md` |
| Primary bottlenecks addressed | N+1, pagination, indexes, bundle |
| Reliability not degraded | `GET /health` 200, heartbeat still 15s, offline fallback works |
| Security not weakened | 401 on unauth curl, no answer leak, CSP present |
| Scalability satisfied | k6 300 VUs pass |
| Costs understood | D1 reads <1M/day, log retention active |
| Monitoring in place | `wrangler tail`, health, web-vitals |
| Alerts working | WAF + rate limit alert |
| Backups tested | Restore to local OK |
| Rollback exists | `wrangler versions` + DB backup |
| Docs updated | ARCHITECTURE.md + RUNBOOK.md |
| Prod observed | 24h post-deploy via dashboard |
| Remaining bottlenecks documented | `ARCHITECTURE.md:372` |
| Follow-up scheduled | Quarterly |

---

## 13. What NOT to Optimize (N/A Justification)

Detailed in `OptimizationChecklist.md` comments, summarized:

- **§10 Infra sizing/autoscaling/VM/HA** — Workers autoscales; no CPU/mem knobs. Don't attempt to "right-size" isolates.
- **§11 Entire OS section (14 items)** — No shell; Cloudflare patches runtime. `compatibility_date` is the only OS-like control (`wrangler.toml:3`).
- **§2 Hardware/OS, §3 queue depth (no queue), §4 context switching, §5 thread/process pools, §6 replication/partitioning/pool** — Single SQLite D1, single-threaded.
- **§8 Storage tiering/IOPS/disk capacity** — Abstracted; monitor D1 storage instead.
- **§9 DNS/LB/packet loss** — Anycast managed.
- **§16 Thread/worker/queue pools, starvation** — Use `Promise.all`, not pools.
- **§18 Right-size infra/licensing/shutdown** — No VMs/licenses.

Optimizing these wastes effort and may break platform assumptions.

---

## 14. Risks & Rollback

| Risk | Mitigation |
|------|-----------|
| Duplicate exam half-written (`worker/index.js:126` without batch) | Use `db.batch()`; test locally `--local` first |
| New indexes lock table on large D1 | Run `CREATE INDEX IF NOT EXISTS` during low traffic; D1 online DDL is fast |
| `VITE_ADMIN_PASSWORD` removal breaks old sessions | Deploy with both `ADMIN_PASSWORD` + fallback `VITE_ADMIN_PASSWORD` for 24h, then remove fallback |
| Pagination breaks existing clients | Keep backwards compat: if no `?limit` → return all (legacy), but page admin UI |
| SW cache expiry breaks offline exam | Test `cached_exam_*` TTL with air-gapped `pnpm preview` |
| `compatibility_date` bump breaks APIs | Deploy to preview worker first (`wrangler deploy --env preview`) |

**Rollback procedure (§17:290 + §23:378):**
1. `npx wrangler versions list` → `npx wrangler rollback --version <prev>`
2. DB: `npx wrangler d1 execute exam-db --remote --file=backups/db-backup-latest.sql`
3. Verify `GET /api/health` 200

---

## 15. Appendix A — File Map & Line References

Key files for implementation (grep-friendly):

| File | Lines | Role |
|------|-------|------|
| `worker/index.js:1` | 1863 | Hono app, all routes |
| `worker/index.js:34` | adminCheck | Auth guard (P0) |
| `worker/index.js:49` | GET /exams | Pagination target |
| `worker/index.js:60,95,136,185,198,208,215` | Mutation routes | Add admin guard |
| `worker/index.js:73` | GET /exams/:id | Strip answer |
| `worker/index.js:279,1355,1386,236` | Logs/Submissions/Analytics/Bank | Gate leaks |
| `worker/index.js:288` | POST /submit | Recompute score server-side |
| `worker/index.js:382,440,524` | Sessions/Proctor | Stale + parallelize |
| `worker/index.js:1210,1232,1738` | Student/records/computeScore | N+1 + grading |
| `worker/schema.sql:173` | Indexes | Add new |
| `wrangler.toml:3,4,7,9` | Config | Date, assets, secret, DB |
| `src/App.jsx:4` | Routes | Lazy split |
| `src/api.js:3,23` | Fetch + adminPass | Timeout + secret |
| `src/utils.js:15,283` | Shuffle + matchesAnswer | Parity |
| `src/pages/Exam.jsx:13,87,164,186,379` | Exam machine | Offline, retry, heartbeat |
| `src/components/QuestionCard.jsx:41,74` | Render + shuffle | XSS + memo |
| `src/pages/admin/Answers.jsx:102,235` | Admin table | Virtualize |
| `public/sw.js:1,26,44` | SW | Version + cache bounds |
| `vite.config.js:5` | Build | Chunks |

---

## 16. Appendix B — Checklist Mapping Table

Per-section mapping: **A** = Apply, **AD** = Adapt, **N/A** = Skip (commented in checklist).

| Checklist § | A | AD | N/A | Notes |
|------------|---|----|-----|-------|
| §1 Goals | 12 | — | — | All apply |
| §2 Inventory | 10 | 3 | 4 | N/A: hardware, OS, queues, cron |
| §3 Observability | 9 | 6 | 1 | AD: CPU/mem → isolate metrics; N/A: queue depth |
| §4 Bottlenecks | 16 | 1 | 1 | AD: disk → D1; N/A: context switch |
| §5 App/Code | 14 | 3 | 4 | AD: concurrency/connection; N/A: threads/shutdown |
| §6 DB | 12 | 1 | 7 | N/A: isolation/pool/replication/partition |
| §7 Caching | 10 | 1 | — | AD: Cache API |
| §8 Storage | 7 | 3 | 4 | N/A: tiering/IOPS/capacity |
| §9 Network | 8 | 3 | 3 | N/A: DNS/LB/packet loss |
| §10 Infra | 2 | 1 | 11 | N/A: sizing/autoscale/VM/HA |
| §11 OS | — | — | 14 | **Entire section N/A** |
| §12 Reliability | 14 | 1 | — | AD: redundancy |
| §13 Security | 14 | 2 | — | AD: ports→routes, firewall→WAF |
| §14 Scalability | 11 | 1 | 1 | AD: vertical/horizontal; N/A: autoscale knob |
| §15 API | 11 | 1 | 1 | N/A: S2S |
| §16 Concurrency | 6 | 1 | 4 | N/A: pools/queue |
| §17 CI/CD | 10 | 2 | — | AD: rollout/rollback |
| §18 Cost | 8 | 2 | 3 | N/A: right-size/licensing/shutdown |
| §19 Testing | 12 | — | — | All apply |
| §20 Change | 10 | — | — | All apply |
| §21 UX | 11 | — | — | All apply |
| §22 Monitoring | 10 | — | — | All apply |
| §23 Docs | 12 | — | — | All apply |
| §24 Continuous | 10 | — | — | All apply |
| §25 Gate | 14 | — | — | All apply |
| **Total** | ~195 | ~35 | ~58 | Overlap due to AD counting |

---

## 17. Appendix C — Effort & Sequencing

| Phase | Effort | Risk | Owner |
|-------|--------|------|-------|
| 0 Baseline | 1-2d | Low | Dev + QA |
| 1 Security | 2-3d | **Critical — do first** | BE + FE |
| 2 DB/Reliability | 3-4d | Medium | BE |
| 3 Perf/UX | 2-3d | Low-Med | FE |
| 4 Cost/Docs/CI | 1-2d | Low | DevOps |

**Total: 9-14 days** if done sequentially, one phase at a time per Checklist Core Rule (§20:327). Can parallelize Phase 0 baseline with Phase 1 scoping.

**Next step:** Review this plan + `OptimizationChecklist.md`, agree on Phase 0 targets (concurrent users, cost), then run `pnpm build` baseline and proceed to Phase 1.

---

*Generated 2026-08-24 — based on full audits of `worker/index.js:1`, `worker/schema.sql:1`, `src/App.jsx:21`, `src/api.js:1`, `src/utils.js:1`, `public/sw.js:1`, `wrangler.toml:1`. Use with `OptimizationChecklist.md` as the live tracker (check boxes as phases complete).*
