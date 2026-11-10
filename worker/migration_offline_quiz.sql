-- Migration for exam-system: Preloaded Offline-Ready Quiz.
-- See docs/OFFLINE_QUIZ.md.
--
-- Run ONCE against the database, BEFORE deploying the worker, with:
--   npx wrangler d1 execute exam-db --local  --file=worker/migration_offline_quiz.sql
--   npx wrangler d1 execute exam-db --remote --file=worker/migration_offline_quiz.sql
--
-- NOTE: this SQLite/D1 build does NOT support "ADD COLUMN IF NOT EXISTS".
-- If applied twice it errors on duplicate column — expected. Apply once.

-- Exam-level switch: permit students to start inside the scheduled window
-- using a preloaded copy. Default off (opt-in per exam).
ALTER TABLE exams ADD COLUMN allow_offline_start INTEGER NOT NULL DEFAULT 0;

-- Server-side proof that a student was eligible and preloaded while online.
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
  UNIQUE (exam_id, student_id),
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

-- Offline attempt metadata on submissions (idempotency + proctor flagging).
ALTER TABLE submissions ADD COLUMN offline_attempt_id TEXT DEFAULT '';
ALTER TABLE submissions ADD COLUMN offline_start INTEGER NOT NULL DEFAULT 0;
ALTER TABLE submissions ADD COLUMN started_at INTEGER DEFAULT 0;
ALTER TABLE submissions ADD COLUMN flagged INTEGER NOT NULL DEFAULT 0;
ALTER TABLE submissions ADD COLUMN flag_reason TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_preloads_exam ON exam_preloads(exam_id);
CREATE INDEX IF NOT EXISTS idx_preloads_student ON exam_preloads(exam_id, student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_offline_attempt ON submissions(offline_attempt_id);
