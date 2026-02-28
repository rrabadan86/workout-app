-- ============================================================
-- Migration: Allow authenticated users to read workout data
-- from feed events (friend workouts, projects, and logs)
-- ============================================================
-- Run this in Supabase SQL Editor

-- 1. Enable RLS on tables (idempotent, no-op if already enabled)
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

-- 2. Add SELECT policies for authenticated users
-- (drop first to be idempotent)
DROP POLICY IF EXISTS "Allow authenticated read workouts" ON public.workouts;
CREATE POLICY "Allow authenticated read workouts"
  ON public.workouts
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated read projects" ON public.projects;
CREATE POLICY "Allow authenticated read projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated read workout_logs" ON public.workout_logs;
CREATE POLICY "Allow authenticated read workout_logs"
  ON public.workout_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- This allows any logged-in user to READ workouts, projects, and logs.
-- Write/Update/Delete operations remain unchanged (only owners can modify).
