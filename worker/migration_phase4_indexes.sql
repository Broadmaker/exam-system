-- Phase 4 final indexes: cover cron scans, ordering, pagination (audit bottleneck)
CREATE INDEX IF NOT EXISTS idx_exams_status_deadline ON exams(status, deadline);
CREATE INDEX IF NOT EXISTS idx_questions_exam_order ON questions(exam_id, part, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_last_seen ON exam_sessions(last_seen);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class ON attendance_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_exam_templates_class ON exam_templates(class_id);
