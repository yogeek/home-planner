-- Quantités sur la liste de courses (« Lait ×2 »)
ALTER TABLE shopping_items ADD COLUMN qty INTEGER NOT NULL DEFAULT 1;
