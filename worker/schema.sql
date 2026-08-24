CREATE TABLE exams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  time_limit INTEGER NOT NULL DEFAULT 60,
  questions_per_set INTEGER NOT NULL DEFAULT 10,
  show_answers INTEGER NOT NULL DEFAULT 1,
  deadline TEXT DEFAULT '',
  access_code TEXT DEFAULT '',
  roster TEXT DEFAULT '[]',
  class_id TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT 'major_exam',
  -- New exams default to 'draft' here (fresh DB); the migration file defaults
  -- existing rows to 'active' so they stay takeable after migrating.
  status TEXT NOT NULL DEFAULT 'draft',
  passing_score REAL NOT NULL DEFAULT 60,
  start_at TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  part INTEGER NOT NULL,
  text TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'multiple_choice',
  choices TEXT NOT NULL,
  answer TEXT NOT NULL,
  explain TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  difficulty TEXT DEFAULT '',
  topic TEXT DEFAULT '',
  competency TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_section TEXT NOT NULL,
  student_id TEXT DEFAULT '',
  seed TEXT NOT NULL,
  answers TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 50,
  tab_switches INTEGER NOT NULL DEFAULT 0,
  time_taken INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT 'manual',
  retry_allowed INTEGER NOT NULL DEFAULT 0,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

CREATE TABLE question_bank (
  id TEXT PRIMARY KEY,
  part INTEGER NOT NULL,
  text TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'multiple_choice',
  choices TEXT NOT NULL,
  answer TEXT NOT NULL,
  explain TEXT DEFAULT '',
  difficulty TEXT DEFAULT '',
  topic TEXT DEFAULT '',
  competency TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE activity_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  details TEXT DEFAULT '',
  admin_name TEXT DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE answer_reviews (
  submission_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  verdict TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (submission_id, question_id),
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

CREATE TABLE exam_sessions (
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

CREATE TABLE attendance (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_section TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'checked_in',
  checked_in TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT DEFAULT '',
  submitted_at TEXT DEFAULT '',
  retry_allowed INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

CREATE TABLE attendance_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT (date('now')),
  access_code TEXT DEFAULT '',
  roster TEXT DEFAULT '[]',
  class_id TEXT DEFAULT '',
  expires_at TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE checkins (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_section TEXT NOT NULL,
  checked_in TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE
);

CREATE TABLE classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT DEFAULT '',
  section TEXT DEFAULT '',
  instructor TEXT DEFAULT '',
  access_code TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE enrollments (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_section TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  UNIQUE (class_id, student_id)
);

CREATE TABLE class_attendance (
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

CREATE TABLE class_grade_categories (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  name TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 0,
  types TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE INDEX idx_questions_exam ON questions(exam_id);
CREATE INDEX idx_submissions_exam ON submissions(exam_id);
CREATE UNIQUE INDEX idx_submissions_unique ON submissions(exam_id, student_name, student_section);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX idx_answer_reviews_submission ON answer_reviews(submission_id);
CREATE INDEX idx_sessions_exam ON exam_sessions(exam_id);
CREATE INDEX idx_sessions_active ON exam_sessions(exam_id, active);
CREATE INDEX idx_attendance_exam ON attendance(exam_id);
CREATE INDEX idx_checkins_session ON checkins(session_id);
CREATE INDEX idx_enrollments_class ON enrollments(class_id);
CREATE INDEX idx_class_attendance_class ON class_attendance(class_id, date);
CREATE INDEX idx_exams_class ON exams(class_id);
CREATE INDEX idx_grade_categories_class ON class_grade_categories(class_id);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL DEFAULT '',
  student_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'announcement',
  exam_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE notification_reads (
  notification_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  read_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (notification_id, student_id),
  FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_class ON notifications(class_id);
CREATE INDEX idx_notifications_student ON notifications(student_id);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notification_reads_student ON notification_reads(student_id);

CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL DEFAULT '',
  auth TEXT NOT NULL DEFAULT '',
  expiration_time TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(student_id, endpoint)
);
CREATE INDEX idx_push_subs_student ON push_subscriptions(student_id);
CREATE INDEX idx_push_subs_endpoint ON push_subscriptions(endpoint);
