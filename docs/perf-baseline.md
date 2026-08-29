# Performance Baseline — Phase 0

**Date:** 2026-08-29
**Commit:** 4066aeb
**Stack:** React 18 + Vite 5 + Tailwind 4 · Hono 4 · Cloudflare Workers + D1

## 1. Bundle (pnpm build 2026-08-29)

```
dist/assets/index-Cveppcq4.css  79.19 kB (13.83 kB gzip)
dist/assets/index-S8kckPXO.js  578.98 kB (154.21 kB gzip)  ← single chunk, no code split
dist/index.html                  4.72 kB
Total Upload: 198.29 KiB / gzip 42.02 KiB (wrangler deploy)
```

**No React.lazy** — `src/App.jsx:4` imports all 14 routes eagerly.
**Heavy deps in main chunk:** `qrcode` (QR modals), `lucide-react` (not split), `react-router-dom`.
**Target:** <200 kB gzip main via `React.lazy` + `manualChunks: {vendor, qr, icons}` (`OPTIMIZATION_PLAN §10`).

## 2. Goals (OPTIMIZATION_PLAN §2)

| Metric | Baseline (to measure next via k6/wrangler tail) | Target |
|--------|-----------------------------------------------|--------|
| `POST /submit` p95 | _todo k6 50 VUs × 100_ | <300 ms |
| `GET /exams/:id` p95 (student) | _todo_ | <150 ms |
| `GET /analytics/:examId` p95 (50Q × 200 subs) | _todo_ | <800 ms |
| Main bundle gzip | 154.21 kB | <200 kB (after split, currently over due to single chunk) → aim 90–110 kB |
| Lighthouse Performance (Landing) | _todo_ | >90 |
| Concurrent exam takers | unknown | 300 sustained |
| Cost | — | <$5/mo |

## 3. Hot Queries — EXPLAIN QUERY PLAN (2026-08-29 local D1)

```
EXPLAIN QUERY PLAN SELECT * FROM enrollments WHERE student_id='TEST-001'
→ SCAN enrollments   ← tablescan, missing index (P1 fix: idx_enrollments_student)

EXPLAIN QUERY PLAN SELECT * FROM submissions WHERE exam_id='test-id'
→ SEARCH submissions USING INDEX idx_submissions_exam (exam_id=?)  ✓

EXPLAIN QUERY PLAN SELECT * FROM exam_sessions WHERE exam_id='x' AND active=1
→ SEARCH exam_sessions USING INDEX idx_sessions_active (exam_id=? AND active=?)  ✓
```

- `enrollments WHERE student_id` → **SCAN** (needs `CREATE INDEX idx_enrollments_student ON enrollments(student_id)` `OPTIMIZATION_PLAN §9`)
- `submissions WHERE exam_id` → indexed OK
- `exam_sessions active` → indexed OK

## 4. Observability (Phase 0 done 2026-08-29)
- `GET /api/health` added `worker/index.js:11` → `SELECT 1` + `Server-Timing: db;dur=ms` + `Cache-Control: no-store`
- `activity_log` still silent `catch{}` (`worker/index.js:31`) — TODO structured logging
- `public/sw.js` caches every 200 forever (no LRU/TTL) — TODO Phase 3

## 5. Security Gap (P0)
- 19 write routes missing `adminCheck()` (`POST /exams:227`, `PUT /exams/:id:274`, `DELETE:323`, `questions:372,385,395,402`)
- `GET /exams/:id` leaks `answer`/`explain` to students (`worker/index.js:246`)
- `GET /logs`, `/submissions/:examId`, `/analytics`, `/bank` public
- `VITE_ADMIN_PASSWORD` in bundle (`src/api.js:23`) + `[vars]` `wrangler.toml:7`
- `cors()` open (`worker/index.js:6`), XSS `dangerouslySetInnerHTML` (`QuestionCard.jsx:106`)

Next: Phase 0 health endpoint + Phase 1 security gates.
