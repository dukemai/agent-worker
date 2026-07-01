ALTER TABLE public.activity_source_mappings
ADD COLUMN IF NOT EXISTS homepage_url TEXT,
ADD COLUMN IF NOT EXISTS activity_listing_url TEXT,
ADD COLUMN IF NOT EXISTS gathering_notes TEXT;

UPDATE public.activity_source_mappings
SET homepage_url = CASE source_domain
  WHEN 'visitstockholm.se' THEN 'https://www.visitstockholm.se/'
  WHEN 'upplevjarfalla.se' THEN 'https://www.upplevjarfalla.se/'
  ELSE homepage_url
END
WHERE homepage_url IS NULL;
