-- Add source_language to growing_sources to record the language of the original content.
ALTER TABLE growing_sources
ADD COLUMN IF NOT EXISTS source_language TEXT DEFAULT 'en';

COMMENT ON COLUMN growing_sources.source_language IS 'BCP-47 language code (e.g. en, sv) for the original source content.';

-- Add language to growing_knowledge to record the language of each nugget.
ALTER TABLE growing_knowledge
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

COMMENT ON COLUMN growing_knowledge.language IS 'BCP-47 language code (e.g. en, sv) for the knowledge content.';

