-- Migration for classes, enrollments, per-class exams, and class attendance.
-- Run against an existing D1 database with:
--   wrangler d1 execute exam-db --file=worker/migration_classes.sql --remote

ALTER TABLE exams ADD COLUMN class_id TEXT DEFAULT '';
ALTER TABLE attendance_sessions ADD COLUMN class_id TEXT DEFAULT '';
ALTER TABLE attendance_sessions ADD COLUMN expires_at TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT DEFAULT '',
  section TEXT DEFAULT '',
  instructor TEXT DEFAULT '',
  access_code TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_section TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  UNIQUE (class_id, student_id)
);

CREATE TABLE IF NOT EXISTS class_attendance (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  date TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'present',
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  UNIQUE (class_id, date, student_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_class ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_attendance_class ON class_attendance(class_id, date);
CREATE INDEX IF NOT EXISTS idx_exams_class ON exams(class_id);