-- English and Vietnamese titles (Swedish remains in `title`).

ALTER TABLE saved_recipes
ADD COLUMN title_en TEXT NOT NULL DEFAULT '',
ADD COLUMN title_vi TEXT NOT NULL DEFAULT '';
