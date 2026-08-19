-- Migration for exam-system: attendance, live proctoring, single-session lock.
-- Run against an existing D1 database with:
--   wrangler d1 execute exam-db --file=worker/migration_attendance.sql --remote

ALTER TABLE exams ADD COLUMN access_code TEXT DEFAULT '';
ALTER TABLE exams ADD COLUMN roster TEXT DEFAULT '[]';
ALTER TABLE submissions ADD COLUMN student_id TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS exam_sessions (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_section TEXT NOT NULL,
  device_id TEXT DEFAULT '',
  tab_switches INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen TEXT NOT NULL DEFAULT (datetime('now')),
  active INTEGER NOT NULL DEFAULT 1,
  kicked INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_section TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'checked_in',
  checked_in TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT DEFAULT '',
  submitted_at TEXT DEFAULT '',
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

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

CREATE INDEX IF NOT EXISTS idx_attendance_exam ON attendance(exam_id);
CREATE INDEX IF NOT EXISTS idx_checkins_session ON checkins(session_id);