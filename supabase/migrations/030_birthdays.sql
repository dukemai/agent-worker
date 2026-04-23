-- Create birthdays table
CREATE TABLE birthdays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  birthday_month INT NOT NULL CHECK (birthday_month >= 1 AND birthday_month <= 12),
  birthday_day INT NOT NULL CHECK (birthday_day >= 1 AND birthday_day <= 31),
  birth_year INT,
  category TEXT NOT NULL CHECK (category IN ('family', 'friend', 'kid_friend')),
  is_recurring BOOLEAN NOT NULL DEFAULT TRUE,
  wishlist TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE birthdays ENABLE ROW LEVEL SECURITY;

-- Simple authenticated policy
CREATE POLICY "Authenticated full access"
ON birthdays
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_birthdays_updated_at
    BEFORE UPDATE ON birthdays
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
