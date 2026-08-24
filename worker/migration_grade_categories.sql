-- Upscale §41 Grade Categories: weighted categories per class (e.g. Quizzes 20%, Major 30%)
CREATE TABLE IF NOT EXISTS class_grade_categories (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  name TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 0,
  types TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_grade_categories_class ON class_grade_categories(class_id);
