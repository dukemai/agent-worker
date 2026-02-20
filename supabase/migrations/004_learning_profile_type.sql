ALTER TABLE learning_profile
ADD COLUMN IF NOT EXISTS profile_type TEXT DEFAULT 'topic';

UPDATE learning_profile
SET profile_type = 'topic'
WHERE profile_type IS NULL;

ALTER TABLE learning_profile
ALTER COLUMN profile_type SET NOT NULL;

ALTER TABLE learning_profile
ADD CONSTRAINT learning_profile_type_check
CHECK (profile_type IN ('topic', 'category'));
