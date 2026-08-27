-- Migration for exam-system: stop shuffling multiple-choice choice letters so a
-- question's display letter always equals its canonical answer key (A=key A, etc.).
--
-- New submissions record answers as canonical choice keys and carry answer_scheme='fixed'.
-- Existing submissions keep answer_scheme='shuffled' so their already-stored scores are
-- preserved and graded exactly as before (per-student seed shuffle).
--
-- Apply with:
--   wrangler d1 execute exam-db --file=worker/migration_answer_scheme.sql --local
--   wrangler d1 execute exam-db --file=worker/migration_answer_scheme.sql --remote

ALTER TABLE submissions ADD COLUMN answer_scheme TEXT NOT NULL DEFAULT 'shuffled';
