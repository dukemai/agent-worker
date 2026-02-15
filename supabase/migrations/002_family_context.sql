-- Family context: key-value store for user preferences (shopping list, interests, etc.)
CREATE TABLE family_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Example keys: shopping_list, seasonal_interests
-- shopping_list: "helmet for kid, winter boots" (items you're looking for)
-- seasonal_interests: "garden, outdoor" (categories that interest you)
