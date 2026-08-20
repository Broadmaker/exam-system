-- Migration for exam-system: track submission reason (manual/auto/timeout/kick) so
-- auto-submitted students can continue or retry their exam, plus per-student
-- admin override to allow/deny retries.
-- Run against an existing D1 database with:
--   wrangler d1 execute exam-db --file=worker/migration_submit_reason.sql --remote

ALTER TABLE submissions ADD COLUMN reason TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE submissions ADD COLUMN retry_allowed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE attendance ADD COLUMN retry_allowed INTEGER NOT NULL DEFAULT 0;