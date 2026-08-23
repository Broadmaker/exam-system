-- Migration for exam-system: assessment types, lifecycle status, passing score,
-- and scheduled start time (Upscale.md §9, §10, §16, §48).
-- Run ONCE against the database, BEFORE deploying the worker, with:
--   wrangler d1 execute exam-db --file=worker/migration_upscale_assessment.sql --remote
-- (or --local for Miniflare / a fresh local setup).
--
-- NOTE: this SQLite/D1 build does NOT support "ADD COLUMN IF NOT EXISTS",
-- so this file is a one-shot migration. If applied to a DB that already has these
-- columns, it errors on duplicate column — that's expected. Apply it once; this
-- is the only time these columns are introduced.

-- Assessment type: quiz | major_exam | long_exam | midterm | final | diagnostic
--                 | pretest | posttest | practice | assignment | survey | custom
ALTER TABLE exams ADD COLUMN type TEXT NOT NULL DEFAULT 'major_exam';

-- Lifecycle status: draft -> scheduled -> active -> closed -> archived.
-- Existing exams default to 'active' so they remain takeable after migrating.
ALTER TABLE exams ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- Passing score as a percentage (0-100). Drives PASSED/FAILED and passing rate.
ALTER TABLE exams ADD COLUMN passing_score REAL NOT NULL DEFAULT 60;

-- Scheduled open time (ISO). Only enforced while status = 'scheduled'.
ALTER TABLE exams ADD COLUMN start_at TEXT DEFAULT '';
