-- Marqueur des occurrences déplacées ou créées manuellement (préservées à la régénération)
ALTER TABLE occurrences ADD COLUMN manual INTEGER NOT NULL DEFAULT 0;
