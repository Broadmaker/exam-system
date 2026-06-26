CREATE TABLE exams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  time_limit INTEGER NOT NULL DEFAULT 60,
  questions_per_set INTEGER NOT NULL DEFAULT 10,
  show_answers INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  part INTEGER NOT NULL,
  text TEXT NOT NULL,
  choices TEXT NOT NULL,
  answer TEXT NOT NULL,
  explain TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_section TEXT NOT NULL,
  seed TEXT NOT NULL,
  answers TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 50,
  tab_switches INTEGER NOT NULL DEFAULT 0,
  time_taken INTEGER NOT NULL DEFAULT 0,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

CREATE TABLE question_bank (
  id TEXT PRIMARY KEY,
  part INTEGER NOT NULL,
  text TEXT NOT NULL,
  choices TEXT NOT NULL,
  answer TEXT NOT NULL,
  explain TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE activity_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  details TEXT DEFAULT '',
  admin_name TEXT DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_questions_exam ON questions(exam_id);
CREATE INDEX idx_submissions_exam ON submissions(exam_id);
CREATE UNIQUE INDEX idx_submissions_unique ON submissions(exam_id, student_name, student_section);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
