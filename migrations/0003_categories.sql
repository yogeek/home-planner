-- Catégories de tâches : les 7 intégrées correspondent aux zones du village,
-- les catégories personnalisées pointent vers une zone du village (par défaut la clairière/loisirs).
-- Le champ `zone` de task_defs et occurrences devient un id de catégorie (plus de CHECK).

PRAGMA defer_foreign_keys = true;

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '⭐',
  zone TEXT NOT NULL DEFAULT 'loisirs',
  builtin INTEGER NOT NULL DEFAULT 0
);

INSERT INTO categories (id, label, emoji, zone, builtin) VALUES
  ('jardin', 'Jardin', '🌿', 'jardin', 1),
  ('piscine', 'Piscine', '💧', 'piscine', 1),
  ('lessive', 'Lessive', '🧺', 'lessive', 1),
  ('cuisine', 'Cuisine', '🍲', 'cuisine', 1),
  ('courses', 'Courses', '🛒', 'courses', 1),
  ('rangement', 'Rangement', '🧹', 'rangement', 1),
  ('loisirs', 'Loisirs', '🎈', 'loisirs', 1);

-- Reconstruction d'occurrences d'abord (elle référençait task_defs), sans CHECK sur zone
CREATE TABLE occurrences_new (
  id TEXT PRIMARY KEY,
  def_id TEXT,
  title TEXT NOT NULL,
  zone TEXT NOT NULL,
  weight INTEGER NOT NULL,
  date TEXT NOT NULL,
  assignee TEXT NOT NULL REFERENCES members(id),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'done', 'skipped')),
  done_at TEXT,
  done_by TEXT,
  validated_by TEXT,
  manual INTEGER NOT NULL DEFAULT 0
);
INSERT INTO occurrences_new SELECT id, def_id, title, zone, weight, date, assignee, status, done_at, done_by, validated_by, manual FROM occurrences;
DROP TABLE occurrences;
ALTER TABLE occurrences_new RENAME TO occurrences;
CREATE INDEX idx_occurrences_date ON occurrences(date);
CREATE INDEX idx_occurrences_assignee_date ON occurrences(assignee, date);

-- Puis reconstruction de task_defs sans CHECK sur zone
CREATE TABLE task_defs_new (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  zone TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 2 CHECK (weight BETWEEN 1 AND 5),
  recurrence TEXT NOT NULL DEFAULT '{}',
  fixed_assignee TEXT REFERENCES members(id),
  child_task INTEGER NOT NULL DEFAULT 0,
  reminder_time TEXT,
  season TEXT NOT NULL DEFAULT 'all' CHECK (season IN ('all', 'summer', 'winter')),
  active INTEGER NOT NULL DEFAULT 1
);
INSERT INTO task_defs_new SELECT id, title, zone, weight, recurrence, fixed_assignee, child_task, reminder_time, season, active FROM task_defs;
DROP TABLE task_defs;
ALTER TABLE task_defs_new RENAME TO task_defs;
