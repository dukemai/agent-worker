-- Flag for recipes the user wants to try cooking (library).

ALTER TABLE saved_recipes
ADD COLUMN want_to_try BOOLEAN NOT NULL DEFAULT false;
