ALTER TABLE recipe_candidates DROP CONSTRAINT recipe_candidates_status_check;
ALTER TABLE recipe_candidates ADD CONSTRAINT recipe_candidates_status_check
  CHECK (status IN ('new', 'want_to_try', 'looks_good', 'needs_changes', 'accepted', 'rejected', 'done'));
