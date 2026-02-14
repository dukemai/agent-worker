-- Tasks table (full task data)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT,
  original_body TEXT,
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  metadata JSONB,
  source TEXT DEFAULT 'email'
);

-- Bucket tables: list of task IDs only
CREATE TABLE today_tasks (
  task_id UUID PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE this_week_tasks (
  task_id UUID PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE later_tasks (
  task_id UUID PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE
);

-- Learning profile (curriculum settings)
CREATE TABLE learning_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  current_level TEXT,
  daily_goal TEXT,
  target_duration_minutes INT DEFAULT 2,
  status TEXT DEFAULT 'active',
  curriculum_outline JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning log (AI-generated lessons + feedback)
CREATE TABLE learning_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES learning_profile(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
