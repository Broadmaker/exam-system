# Preloaded Offline-Ready Quiz

Status: Implementation in progress
Owner: WMSU Exam System
Last updated: 2026-11-10

## 1. Goal

Students often lose connection during quizzes. This feature lets them **preload** a quiz onto their device while online, keep the questions **locked until the scheduled open time**, and then **start and finish the quiz with weak or no signal**. Answers are queued locally and graded by the server when the connection returns.

## 2. Product rules

| Rule | Behavior |
|---|---|
| Preload before open | Allowed only when **Allow offline start** is on and the student is **verified**: class-linked exams (verified enrollment) or exams with an access code. |
| Standalone no-code exams | Cannot preload before open. They preload once the exam is open. |
| Questions before open | Stored on device but never rendered. The gate shows only "Preloaded · unlocks <time>". |
| Offline start | Allowed only when the instructor enabled **Allow offline start** and the current time is inside `start_at` → `deadline`. |
| Default | `allow_offline_start = 0` (opt-in per exam). |
| Grading | Server-side only. No answer keys are sent to the client. |
| Multi-device overlap | Submission is kept but **flagged** for proctor review. |
| At-rest protection | App-level lock only: questions are hidden until the window opens. A technical user can inspect browser storage; the server still rejects out-of-window starts by validating `started_at`. |

## 3. Data model

Migration: `worker/migration_offline_quiz.sql` (apply local **and** remote before deploying the Worker).

### `exams`
```sql
ALTER TABLE exams ADD COLUMN allow_offline_start INTEGER NOT NULL DEFAULT 0;
```

### `exam_preloads` (new)
Server-side proof that a student was eligible and preloaded while online.
```sql
CREATE TABLE IF NOT EXISTS exam_preloads (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT DEFAULT '',
  student_section TEXT DEFAULT '',
  device_id TEXT DEFAULT '',
  package_hash TEXT DEFAULT '',
  preloaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_synced_at TEXT DEFAULT '',
  UNIQUE (exam_id, student_id)
);
```

### `submissions`
```sql
ALTER TABLE submissions ADD COLUMN offline_attempt_id TEXT DEFAULT '';
ALTER TABLE submissions ADD COLUMN offline_start INTEGER NOT NULL DEFAULT 0;
ALTER TABLE submissions ADD COLUMN started_at INTEGER DEFAULT 0;
ALTER TABLE submissions ADD COLUMN flagged INTEGER NOT NULL DEFAULT 0;
ALTER TABLE submissions ADD COLUMN flag_reason TEXT DEFAULT '';
```

`worker/schema.sql` is the canonical DDL and must include the same changes.

## 4. Server API (`worker/index.js`)

### `GET /api/exams/:id/preload`
Query: `student_id`, `code`, `device_id`.

Eligibility:
- Class-linked → enrollment must match `student_id`.
- Access-code exam → code must match.
- Open standalone exam → allowed once open.
- Scheduled standalone without code → rejected until open.
- Draft / archived / closed / past deadline → rejected.

Returns safe metadata (`allow_offline_start`, `start_at`, `deadline`, `status`, `updated_at`), stripped questions, `not_before`, `server_time`, and `package_hash`. Upserts `exam_preloads` and logs `preload`. Never returns answer keys.

### `GET /api/exams/:id`
Exposes `allow_offline_start` in public metadata. Existing question locking for scheduled exams is unchanged.

### `POST /api/exams/:id/session/sync`
Called when an offline-started student reconnects.
- Verifies preload proof + window.
- Creates/refreshes an `exam_sessions` row and marks attendance started (source `offline`).
- If another device/session exists, sets `flagged=1` and reason `offline_multi_session` on the eventual submission, but keeps the attempt.
- Idempotent on `offline_attempt_id`.

### `POST /api/submit`
Accepts `offline_attempt_id`, `offline_start`, `device_id`, `preloaded_package_hash`, and `started_at`.
- Idempotent replay when `offline_attempt_id` matches an existing submission.
- Validates offline start: `allow_offline_start`, `started_at` inside `[start_at, deadline]`, valid preload proof or enrollment.
- Persists offline metadata and flags.
- Reconciles session/attendance when `/session/sync` was not called.

### Admin exam writes
`allow_offline_start` is added to create, update, duplicate, and list responses.

## 5. Client offline package (`src/offline.js`)

Key: `offline_quiz_v2_<examId>`. Legacy `cached_exam_<id>` remains as a fallback.

```js
{
  v: 2,
  package_hash,
  exam_id,
  exam_updated_at,
  not_before,            // ms epoch
  deadline,              // ms epoch or null
  allow_offline_start,
  status,
  cached_at,
  student: { id, name, section },
  device_id,
  questions: [...]
}
```

Helpers:
- `saveOfflineQuiz(examId, payload)` — only saves unlocked questions and never overwrites good questions with an empty list.
- `loadOfflineQuiz(examId)` / `hasOfflineQuiz(examId)` / `clearOfflineQuiz(examId)`.
- `isWindowOpen(pkg, now)` — app-level unlock check.
- `pruneOfflineQuizzes()` — keep a small LRU set and swallow quota errors.

## 6. Student flow (`src/pages/Exam.jsx`)

Before open (scheduled):
- Show the preload-aware gate with Student ID (+ access code when required).
- Verify → `GET /preload` → save package.
- Show "Questions preloaded · unlocks <start_at>".
- Never mount `QuestionCard` before `started`.

At open time:
- Online → normal `session/start`.
- Offline + package + `allow_offline_start` → **Start Offline**.
  - Generate `offline_attempt_id`, persist `offline_start`, `started_at`, package hash.
  - Load questions from the package and apply the deterministic shuffle.
  - Skip heartbeat while offline.
- Offline without permission → "Connect to start — your preloaded copy is ready."

On reconnect:
- Call `/session/sync`, then resume heartbeat.
- Flagged attempts still submit normally.

Submission queue:
- Includes `offline_attempt_id`.
- Exponential backoff with jitter (`1s → 2s → 4s → 8s → 16s`), retries on `online`, `focus`, `visibilitychange`, max 5 attempts, then a manual **Retry now**.
- Clears on success, `409`, or no-answers `400`.

Persistence:
- `exam_state_<id>` stores `offline_start`, `offline_attempt_id`, and `preloaded_package_hash`.
- Mid-session resume ignores package TTL.

## 7. Admin UI

- `CreateExam` — **Allow offline start** toggle with help text.
- `Preview` — display the setting.
- `Proctor` / `Results` / `Answers` — show a **Flagged offline start** badge and reason.
- `ActivityLog` — records `preload`, `session_sync`, `offline_submit_flagged`.

## 8. Security notes

- App-level lock only; preloaded questions are inspectable before open. Accepted tradeoff for offline capability.
- Device clock manipulation cannot produce an accepted score: the server validates `started_at` against `start_at`/`deadline`.
- Preload before open is restricted to enrolled or access-code students on exams with **Allow offline start**; standalone no-code exams cannot preload early.
- Offline start requires a real `/preload` proof (or class enrollment) and a valid `started_at` window; a plain GET cache alone is not accepted.
- Answer keys never leave the server.
- Offline multi-device conflicts are flagged, not silently accepted.

## 9. Verification

- `node --check worker/index.js`
- `pnpm build`
- Local migration: `npx wrangler d1 execute exam-db --local --file=worker/migration_offline_quiz.sql`
- Manual matrix:
  1. Scheduled class-linked exam → verify → preload ready, no questions rendered.
  2. At `start_at`, device offline → Start Offline → answer → queued submission.
  3. Reconnect → session/attendance sync → submission graded.
  4. `allow_offline_start = 0` → offline start blocked.
  5. Second device/session → submission kept + flagged.
  6. Duplicate retry with same `offline_attempt_id` → no duplicate row.
  7. Standalone no-code scheduled exam cannot preload early.
  8. Wrong access code cannot preload.

## 10. Rollout order

1. Migration + schema + worker preload/submit endpoints.
2. Admin toggle + API client.
3. `offline.js` + preload gate UI.
4. Offline start + reconnect sync + idempotent queue.
5. Proctor/Results flag display + docs.

## 11. Known limitations

- Unlock time is the existing `start_at`; closure is the existing `deadline`.
- `localStorage` (~5 MB) holds the package. Move to IndexedDB if question banks grow large.
- A mid-session admin edit to questions can diverge from the preloaded copy; the active attempt is left untouched.
