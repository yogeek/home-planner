-- Le Village : schéma initial

CREATE TABLE members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  creature TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('adult', 'child')),
  color TEXT NOT NULL,
  notif_prefs TEXT NOT NULL DEFAULT '{"morning":true,"evening":true}',
  created_at TEXT NOT NULL
);

CREATE TABLE push_subs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id TEXT NOT NULL REFERENCES members(id),
  endpoint TEXT NOT NULL UNIQUE,
  keys TEXT NOT NULL
);

CREATE TABLE task_defs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  zone TEXT NOT NULL CHECK (zone IN ('jardin', 'piscine', 'lessive', 'cuisine', 'courses', 'rangement')),
  weight INTEGER NOT NULL DEFAULT 2 CHECK (weight BETWEEN 1 AND 5),
  recurrence TEXT NOT NULL DEFAULT '{}',
  fixed_assignee TEXT REFERENCES members(id),
  child_task INTEGER NOT NULL DEFAULT 0,
  reminder_time TEXT,
  season TEXT NOT NULL DEFAULT 'all' CHECK (season IN ('all', 'summer', 'winter')),
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE occurrences (
  id TEXT PRIMARY KEY,
  def_id TEXT REFERENCES task_defs(id),
  title TEXT NOT NULL,
  zone TEXT NOT NULL,
  weight INTEGER NOT NULL,
  date TEXT NOT NULL,
  assignee TEXT NOT NULL REFERENCES members(id),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'done', 'skipped')),
  done_at TEXT,
  done_by TEXT,
  validated_by TEXT
);
CREATE INDEX idx_occurrences_date ON occurrences(date);
CREATE INDEX idx_occurrences_assignee_date ON occurrences(assignee, date);

CREATE TABLE shopping_items (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  aisle TEXT NOT NULL DEFAULT 'autre',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'checked')),
  added_by TEXT NOT NULL,
  added_at TEXT NOT NULL,
  checked_at TEXT
);

CREATE TABLE purchase_history (
  label TEXT NOT NULL,
  aisle TEXT NOT NULL DEFAULT 'autre',
  purchased_at TEXT NOT NULL
);
CREATE INDEX idx_purchase_label ON purchase_history(label);

CREATE TABLE village (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  acorns INTEGER NOT NULL DEFAULT 0,
  zone_last_done TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE progress (
  member_id TEXT PRIMARY KEY REFERENCES members(id),
  streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT,
  milestones TEXT NOT NULL DEFAULT '[]'
);
