-- Tâches « à plusieurs » : les occurrences d'un même travail partagé sont liées par group_id.
-- Chaque participant a sa propre occurrence (donc ses glands, sa série), la zone se rafraîchit
-- dès la première complétion. group_id NULL = tâche à une seule personne (cas courant).
ALTER TABLE occurrences ADD COLUMN group_id TEXT;
CREATE INDEX idx_occurrences_group ON occurrences(group_id);
