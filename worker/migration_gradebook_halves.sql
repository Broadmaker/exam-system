-- Gradebook first/second half split.
-- `exams.half` lets an instructor assign each exam (topic) to a half so the
-- two halves are averaged separately and never mixed.
-- Per-class weights default to 60:40 and are configurable in the gradebook.
ALTER TABLE exams ADD COLUMN half TEXT NOT NULL DEFAULT '';
ALTER TABLE classes ADD COLUMN first_half_weight REAL NOT NULL DEFAULT 60;
ALTER TABLE classes ADD COLUMN second_half_weight REAL NOT NULL DEFAULT 40;
