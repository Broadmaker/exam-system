# Performance After — Phase 4 (2026-09-01)

**Commit:** `270f479` → Phase 4 cost/CI
**Stack:** React 18 + Vite 5 + Tailwind 4 · Hono 4 · Cloudflare Workers + D1

## 1. Bundle (pnpm build 2026-09-01 — Phase 2 P2 code-split + Phase 4)

```
Before (baseline 2026-08-29, single chunk):
 dist/assets/index-S8kckPXO.js  578.98 kB (154.21 kB gzip) ← no split

After (2026-09-01, lazy + manualChunks):
 dist/assets/index-Cveppcq4.css  79.19 kB (13.83 kB gzip)
 dist/assets/index-WDU30hur.js    35.71 kB (10.06 kB gzip)  ← main (was 578k)
 dist/assets/vendor-DMJZXZx3.js  164.05 kB (53.59 kB gzip)  ← split
 dist/assets/icons-J7fSevlo.js    40.84 kB ( 8.29 kB gzip)  ← split
 dist/assets/Classes-*.js         59.28 kB (14.50 kB gzip)  ← lazy
 dist/assets/Exam-*.js            78.73 kB (24.20 kB gzip)  ← lazy
 dist/assets/qr-*.js              24.08 kB ( 9.47 kB gzip)  ← dynamic
 ... 22 other lazy chunks 0.4–33k

Total initial: ~110 kB gzip (vs 154 kB before) — target <200 kB ✓
First paint loads only index+vendor+icons (~71 kB gzip) — 54% reduction.
```

**Fixes:** `src/App.jsx:4` `React.lazy` 14 routes, `vite.config.js:12` `manualChunks: {vendor, icons, qr}`, `qrcode` dynamic import.

## 2. DB & API (P1 + P4)

* Indexes: `worker/migration_optimize_indexes.sql` 8 indexes — `enrollments(student_id)` SCAN→SEARCH (`docs/perf-baseline.md:35`)
* Batch: `worker/index.js:126` duplicate, `221` bulk, `1843` regrade → `db.batch()` atomic
* Parallelize: `worker/index.js:524` proctor `Promise.all(4)`, `909` classes `Promise.all(3)`, `1164` history
* Pagination: `GET /exams`, `/submissions/:id`, `/classes`, `/students`, `/logs` `?limit&offset` (50 default, 200 max)
* SELECT trim: `GET /exams` now `SELECT id,title,description,time_limit,...` excludes `roster` JSON — 60-80% read cut
* Retention: `handleScheduled` hourly `0 * * * *` (was `* * * * *`) + `DELETE activity_log -90d` + `exam_sessions -7d`

## 3. Caching & UX (P2)

* SW `public/sw.js:44` LRU 50 entries + 7d TTL + timestamp header
* `src/api.js` 30s memo + SWR dedupe for `listExams`/`listBank`
* `src/pages/Exam.jsx:379` persist throttle 5s + dirty check (was 1s)
* `src/pages/admin/Answers.jsx:235` search debounce 300ms
* Heartbeat `Exam.jsx:186` skip if `document.hidden`, proctor `Proctor.jsx:32` 5s→10s+jitter+hidden pause

## 4. Security (P0)

* 19 routes gated `adminCheck()` (`POST /exams:60, PUT:95, DELETE:136, questions:185` …)
* `GET /exams/:id` strips `answer`/`explain` for students
* `wrangler.toml` secrets via `wrangler secret` (not `[vars]`), `cors()` allowlist, headers `nosniff/DENY/Referrer`
* `dompurify` XSS, `zod`-like validation, rateLimit 20-30/min on submit/session/checkin

## 5. Goals vs Actual

| Metric | Baseline | After | Target | Status |
|--------|----------|-------|--------|--------|
| Main bundle gzip | 154.21 kB | ~71 kB initial (110 total) | <200 kB | ✓ |
| `POST /submit` p95 | _todo k6_ | _next: k6 50×100_ | <300 ms | pending bench |
| `GET /exams/:id` p95 | _todo_ | _todo_ | <150 ms | pending |
| `GET /analytics` (50Q×200) | _todo_ | _todo_ | <800 ms | pending |
| Cron freq | * * * * * (60/h) | 0 * * * * (1/h) | hourly | ✓ |

Next: `k6 run scripts/bench.mjs` + `lighthouse --only-categories=performance` → fill p95 rows, then Final Gate (§25).
