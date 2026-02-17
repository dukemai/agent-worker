ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE today_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE this_week_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE later_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_context ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access" ON tasks;
CREATE POLICY "Authenticated full access"
ON tasks
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access" ON today_tasks;
CREATE POLICY "Authenticated full access"
ON today_tasks
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access" ON this_week_tasks;
CREATE POLICY "Authenticated full access"
ON this_week_tasks
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access" ON later_tasks;
CREATE POLICY "Authenticated full access"
ON later_tasks
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access" ON learning_profile;
CREATE POLICY "Authenticated full access"
ON learning_profile
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access" ON learning_log;
CREATE POLICY "Authenticated full access"
ON learning_log
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access" ON family_context;
CREATE POLICY "Authenticated full access"
ON family_context
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
