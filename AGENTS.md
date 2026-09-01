# WMSU Exam System — AGENTS.md

A web assessment-first academic management platform (exam + quiz + attendance + academic records) for a university. React front-end, Hono Worker backend on Cloudflare (Workers + D1 + Workers Assets), PWA/offline exam shell.

## Project
- **Stack:** React 18 + Vite 5 + Tailwind 4 (frontend) · Hono 4 (backend) · Cloudflare Workers + D1 (SQLite) · PWA (SW + manifest). Package manager: **pnpm**.
- **Entry points:** frontend `src/main.jsx` → `src/App.jsx` (routes); backend `worker/index.js` (single Hono Worker, ~50 routes); DB schema `worker/schema.sql`.
- **Deployment:** a single Cloudflare Worker (`wrangler.toml`) that serves the built SPA from `dist/` as assets with SPA fallback, plus a D1 DB binding named `DB`.

## Commands
- `pnpm dev` — Vite dev server on :5173 (proxies `/api` → `http://127.0.0.1:8787`).
- `npx wrangler dev` — Worker + local D1 (Miniflare) on :8787. **Run this together with `pnpm dev` in a second terminal.**
- `pnpm build` — Vite production build → `dist/` (gitignored).
- `pnpm preview` — preview `dist/`.
- `pnpm run deploy:worker` — `wrangler deploy` (Worker + assets + D1).
- `pnpm run deploy:pages` — build + `wrangler pages deploy`.
- **DB migration (local):** `npx wrangler d1 execute exam-db --local --file=worker/migration_<name>.sql`
- **DB migration (remote):** `npx wrangler d1 execute exam-db --remote --file=worker/migration_<name>.sql`
- **Seed (local):** `node worker/seed.mjs` or `node scripts/seed.mjs` (scripts/seed_fill_blank.mjs).
- No unit test/lint tooling configured — verification is `node --check <file>` for JS syntax + `pnpm build`.

## Architecture
- **`worker/index.js`** — all backend routes. Per-route guard `adminCheck()` compares `Authorization` header to `c.env.VITE_ADMIN_PASSWORD` (duplicated to frontend `AuthGate` via the same env `VITE_ADMIN_PASSWORD`). No JWTs; public student routes vs admin routes.
- **`worker/schema.sql`** — canonical DDL (tables: exams, questions, submissions, question_bank, activity_log, answer_reviews, exam_sessions, attendance, attendance_sessions, checkins, classes, enrollments, class_attendance). Migrations (`worker/migration_*.sql`) add columns/features incrementally — apply to local AND remote before deploying the Worker.
- **`src/App.jsx`** — route table: public (/, /exam, /checkin, /enroll, /records, /leaderboard) + admin (`/admin/*` wrapped in `AdminLayout` + `AuthGate`).
- **`src/api.js`** — single API client; `BASE = VITE_API_URL || '/api'`. `api.adminPass()` sends the shared password as `Authorization` for admin calls.
- **`src/utils.js`** — deterministic seeding/shuffle (`seededRandom`, `shuffleWithSeed`), fill-in-the-blank grading parity (`matchesAnswer`, `canonicalize`), and shared constants (`EXAM_TYPE_LABELS`, `EXAM_STATUS_TONES`, `EXAM_STATUS_LABELS`). Student-exam shuffle must match `worker/index.js` grading.
- **`src/pages/Exam.jsx`** — the heavy student exam state machine (gate → session start → heartbeat → submit → review/retry), offline fallback via localStorage.
- **`src/pages/admin/*`** — CreateExam, Dashboard, Results, Answers, Regrade, Proctor, Classes, QuestionBank, Preview, ActivityLog.

## Conventions
- **Grading parity:** the fill-in matching logic exists **twice** — client (`src/utils.js`) and server (`worker/index.js`) — keep them in sync. Per-student question/choice randomization uses a hash seed; server reproduces it for grading.
- **Admin auth:** admin sessions use an **HttpOnly cookie** (`admin_session`) issued via `POST /api/admin/login`, verified by `adminCheck(c)` on the worker. Client admin calls send `{ credentials: 'include' }` (no `Authorization` header — the old `Authorization: adminPass()` flow was removed by the security fix). `src/components/AuthGate.jsx` verifies the session via `/api/admin/me` before mounting admin pages. Never trust frontend-only permissions.
- **Same-origin `/api` is REQUIRED:** the frontend API base must be the **relative `/api`** (`import.meta.env.VITE_API_URL || '/api'`), never an absolute `workers.dev` URL. The `admin_session` cookie is `SameSite=Strict`, so cross-origin calls to the Worker 401 and admin data won't load. Don't set `VITE_API_URL` to a workers.dev origin in production builds.
- **Exam lifecycle:** `type` (assessment kind), `status` (draft→scheduled→active→closed→archived), `passing_score` (0-100, clamped), `start_at` (scheduled open). New exam access enforced at `/session/start` and `/submit`; mid-session students must always be able to finish (don't hard-block finalize for resumed sessions).
- **Response shape:** `submissions` and `leaderboard` return `{ passing_score, results[] }` (not a bare array) — read `data.results` in consumers. Each submission carries a `passed` flag.
- **Theme:** UI colors come from CSS variables in `src/styles/tokens.css` (e.g. `var(--color-surface)`, `--color-success`, `--color-navy-700`). Prefer these over hardcoded hex so dark mode works. Use Tailwind utility classes or inline vars consistently.
- **PWA/offline:** `public/sw.js` (cache version `exam-portal-v7`), registered only in PROD (`src/main.jsx`). Bump cache version when the shell changes. Exam state cached as `cached_exam_<id>` / `exam_state_<id>` / `pending_submission_` in localStorage.
- **Secrets:** never commit `VITE_ADMIN_PASSWORD` / DB credentials into AGENTS.md or source. Values live in `.env`, `.env.production`, `wrangler.toml` (referenced, not echoed).
- **Data:** `activity_log` is the append-only audit log; new admin writes should `await log(db, action, details)`.

## Notes
- **Two separate deployments:** the **Worker** (`pnpm run deploy:worker`, serves `/api` + D1) and **Cloudflare Pages** (`pnpm run deploy:pages`, serves the SPA from `dist/` + `functions/`) are separate sites/URLs (pages.dev vs workers.dev). Do not conflate them.
- **Live URLs:** Pages = `exam-system-4h2.pages.dev` (the frontend you use); Worker API = `exam-system.sanigkram24.workers.dev` (used as API origin).
- **`functions/api/[[path]].js`** is the Pages→Worker proxy: any `/api/*` request to Pages is forwarded to the Worker with Cookie/Set-Cookie pass-through. Keep it (Pages has no native API; without it `/api/*` returns the SPA fallback).
- **`.env.production` is gitignored** — not in the repo. The GitHub/cloud build relies on the committed default `VITE_API_URL=''` → relative `/api`, so a fresh cloud build is correct as long as you DON'T rely on an absolute workers URL.
- **CI (`build` job) only validates code** (`node --check` + `pnpm build` + `wrangler deploy --dry-run`, no token needed) — it does NOT deploy Pages. A `deploy-pages` job was added then removed; deploys are manual via `pnpm run deploy:pages`.
- **Deploying Pages reliably:** `pnpm run deploy:pages` pushes the verified local `dist/` + the proxy. The Pages **GitHub auto-deploy can serve a stale/wrong build** (e.g. an old absolute `/api` build), which breaks admin data. If you use manual deploy, prefer disabling Pages auto-deploy to avoid stale builds overwriting good ones.
- **If admin data is empty / 401s appear:** first reconfirm the live Pages build uses relative `/api` (not an absolute workers URL) and the `functions/` proxy is deployed; then hard-refresh / incognito + re-login (stale cookies/SW are the usual cause once the build is correct).
- **Admin password rotation:** the value used during verification is in this repo's conversation log; rotate `ADMIN_PASSWORD` in the Cloudflare dashboard when convenient.
