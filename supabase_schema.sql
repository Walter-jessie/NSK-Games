-- =====================================================================
-- NSK Bearing Challenge — Supabase Cloud Database Schema
-- Execute in Supabase SQL Editor: https://feoxbapimyqxjlalqdem.supabase.co
-- =====================================================================

-- 1. Create Leaderboard Table
CREATE TABLE IF NOT EXISTS public.leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL,
    department TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    accuracy INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for instant leaderboard ranking queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON public.leaderboard (score DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_employee ON public.leaderboard (employee_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_dept ON public.leaderboard (department);

-- 2. Create Player Profiles & Stats
CREATE TABLE IF NOT EXISTS public.player_profiles (
    employee_id TEXT PRIMARY KEY,
    department TEXT NOT NULL,
    total_games INTEGER NOT NULL DEFAULT 1,
    high_score INTEGER NOT NULL DEFAULT 0,
    last_played_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Row Level Security (RLS) Policies
-- Allow anonymous/public read and insert from the training portal app
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read leaderboard" 
ON public.leaderboard FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert leaderboard" 
ON public.leaderboard FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public read profiles" 
ON public.player_profiles FOR SELECT 
USING (true);

CREATE POLICY "Allow public upsert profiles" 
ON public.player_profiles FOR ALL 
USING (true)
WITH CHECK (true);
