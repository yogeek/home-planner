-- Village v2 : rôle ado, absences, tâches « à prendre », moment de la journée, réglages famille,
-- mercis, récompenses, échanges de tâches.

PRAGMA defer_foreign_keys = true;

-- Habitants : rôle « teen », absence et jours chargés
CREATE TABLE members_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  creature TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('adult', 'teen', 'child')),
  color TEXT NOT NULL,
  notif_prefs TEXT NOT NULL DEFAULT '{"morning":true,"evening":true}',
  created_at TEXT NOT NULL,
  away_until TEXT,
  busy_days TEXT NOT NULL DEFAULT '[]'
);
INSERT INTO members_new (id, name, creature, role, color, notif_prefs, created_at)
  SELECT id, name, creature, role, color, notif_prefs, created_at FROM members;
DROP TABLE members;
ALTER TABLE members_new RENAME TO members;

-- Occurrences : assigné facultatif (tâche à prendre), moment, « confiée par »
CREATE TABLE occurrences_new (
  id TEXT PRIMARY KEY,
  def_id TEXT,
  title TEXT NOT NULL,
  zone TEXT NOT NULL,
  weight INTEGER NOT NULL,
  date TEXT NOT NULL,
  assignee TEXT REFERENCES members(id),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'done', 'skipped')),
  done_at TEXT,
  done_by TEXT,
  validated_by TEXT,
  manual INTEGER NOT NULL DEFAULT 0,
  group_id TEXT,
  moment TEXT,
  handed_by TEXT
);
INSERT INTO occurrences_new (id, def_id, title, zone, weight, date, assignee, status, done_at, done_by, validated_by, manual, group_id)
  SELECT id, def_id, title, zone, weight, date, assignee, status, done_at, done_by, validated_by, manual, group_id FROM occurrences;
DROP TABLE occurrences;
ALTER TABLE occurrences_new RENAME TO occurrences;
CREATE INDEX idx_occurrences_date ON occurrences(date);
CREATE INDEX idx_occurrences_assignee_date ON occurrences(assignee, date);
CREATE INDEX idx_occurrences_group ON occurrences(group_id);

-- Tâches récurrentes : moment et « au premier qui la prend »
ALTER TABLE task_defs ADD COLUMN moment TEXT;
ALTER TABLE task_defs ADD COLUMN pool INTEGER NOT NULL DEFAULT 0;

-- Réglages de la famille (code parent, objectif de la semaine, vacances)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Les « merci » entre habitants
CREATE TABLE thanks (
  occurrence_id TEXT NOT NULL,
  from_member TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (occurrence_id, from_member)
);

-- Récompenses définies par les parents, et récompenses obtenues
CREATE TABLE rewards (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🎁',
  cost INTEGER NOT NULL CHECK (cost > 0)
);
CREATE TABLE reward_claims (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  title TEXT NOT NULL,
  emoji TEXT NOT NULL,
  cost INTEGER NOT NULL,
  claimed_at TEXT NOT NULL
);

-- Échanges de tâches proposés entre habitants
CREATE TABLE swaps (
  id TEXT PRIMARY KEY,
  from_occ TEXT NOT NULL,
  to_occ TEXT NOT NULL,
  from_member TEXT NOT NULL,
  to_member TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TEXT NOT NULL
);
