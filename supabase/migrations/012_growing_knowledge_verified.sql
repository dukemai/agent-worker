-- Add verified flag to growing_knowledge so users can confirm trusted nuggets.
ALTER TABLE growing_knowledge
ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN growing_knowledge.verified IS 'Whether this knowledge nugget has been verified by the user.';
