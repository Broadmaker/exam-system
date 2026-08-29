-- Phase P1: Optimize indexes (OPTIMIZATION_PLAN §9)
-- Run: npx wrangler d1 execute exam-db --local --file=worker/migration_optimize_indexes.sql
--      npx wrangler d1 execute exam-db --remote --file=worker/migration_optimize_indexes.sql

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_exam_student ON submissions(exam_id, student_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_checkins_unique ON checkins(session_id, student_id);
CREATE INDEX IF NOT EXISTS idx_classes_access_code ON classes(access_code);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_access_code ON attendance_sessions(access_code);
CREATE INDEX IF NOT EXISTS idx_sessions_exam_student_active ON exam_sessions(exam_id, student_id, active);
CREATE INDEX IF NOT EXISTS idx_class_attendance_student ON class_attendance(class_id, student_id, date);
