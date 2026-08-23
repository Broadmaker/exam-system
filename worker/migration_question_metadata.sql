-- Migration for exam-system: question metadata (Upscale.md §13, §14).
-- Adds difficulty / topic / competency / tags to both the reusable question
-- bank and the per-exam question copies.
--
-- Run ONCE against the database, BEFORE deploying the worker, with:
--   wrangler d1 execute exam-db --file=worker/migration_question_metadata.sql --remote
-- (or --local for Miniflare / a fresh local setup).
--
-- NOTE: this SQLite/D1 build does NOT support "ADD COLUMN IF NOT EXISTS",
-- so this file is a one-shot migration. If applied to a DB that already has these
-- columns, it errors on duplicate column — that's expected. Apply it once; this
-- is the only time these columns are introduced.

ALTER TABLE question_bank ADD COLUMN difficulty TEXT DEFAULT '';
ALTER TABLE question_bank ADD COLUMN topic TEXT DEFAULT '';
ALTER TABLE question_bank ADD COLUMN competency TEXT DEFAULT '';
ALTER TABLE question_bank ADD COLUMN tags TEXT DEFAULT '';

ALTER TABLE questions ADD COLUMN difficulty TEXT DEFAULT '';
ALTER TABLE questions ADD COLUMN topic TEXT DEFAULT '';
ALTER TABLE questions ADD COLUMN competency TEXT DEFAULT '';
ALTER TABLE questions ADD COLUMN tags TEXT DEFAULT '';
