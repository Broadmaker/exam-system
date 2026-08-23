-- Migration for exam-system: assessment types, lifecycle status, passing score,
-- and scheduled start time (Upscale.md §9, §10, §16, §48).
-- Run against an existing D1 database with:
--   wrangler d1 execute exam-db --file=worker/migration_upscale_assessment.sql --remote
--
-- Idempotent: each ADD COLUMN uses IF NOT EXISTS, so this file may be re-run
-- safely (e.g. if D1 previously lingered in a half-migrated state).

-- Assessment type: quiz | major_exam | long_exam | midterm | final | diagnostic
--                 | pretest | posttest | practice | assignment | survey | custom
ALTER TABLE exams ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'major_exam';

-- Lifecycle status: draft -> scheduled -> active -> closed -> archived.
-- Existing exams default to 'active' so they remain takeable after migrating.
ALTER TABLE exams ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Passing score as a percentage (0-100). Drives PASSED/FAILED and passing rate.
ALTER TABLE exams ADD COLUMN IF NOT EXISTS passing_score REAL NOT NULL DEFAULT 60;

-- Scheduled open time (ISO). Only enforced while status = 'scheduled'.
ALTER TABLE exams ADD COLUMN IF NOT EXISTS start_at TEXT DEFAULT '';
