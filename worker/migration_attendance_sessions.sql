-- Migration for standalone attendance sessions (check-in without an exam).
-- Run against an existing D1 database with:
--   wrangler d1 execute exam-db --file=worker/migration_attendance_sessions.sql --remote

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT (date('now')),
  access_code TEXT DEFAULT '',
  roster TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_section TEXT NOT NULL,
  checked_in TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_checkins_session ON checkins(session_id);