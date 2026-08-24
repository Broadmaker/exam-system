-- Upscale §66 Exam Templates: save exam shells + questions as reusable templates
CREATE TABLE IF NOT EXISTS exam_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'major_exam',
  time_limit INTEGER NOT NULL DEFAULT 60,
  questions_per_set INTEGER NOT NULL DEFAULT 10,
  show_answers INTEGER NOT NULL DEFAULT 1,
  passing_score REAL NOT NULL DEFAULT 60,
  class_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exam_template_questions (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  part INTEGER NOT NULL DEFAULT 1,
  text TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'multiple_choice',
  choices TEXT NOT NULL DEFAULT '[]',
  answer TEXT NOT NULL,
  explain TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  difficulty TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL DEFAULT '',
  competency TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  FOREIGN KEY (template_id) REFERENCES exam_templates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_template_questions_template ON exam_template_questions(template_id);
