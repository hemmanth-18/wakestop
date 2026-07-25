-- ==========================================
-- WakeStop Supabase PostgreSQL Database Schema
-- Paste this script into Supabase SQL Editor and click RUN
-- ==========================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bus Stops Table
CREATE TABLE IF NOT EXISTS public.stops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL
);

-- 3. Trips Table
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  start_name TEXT,
  start_lat DOUBLE PRECISION,
  start_lng DOUBLE PRECISION,
  destination_name TEXT NOT NULL,
  destination_lat DOUBLE PRECISION NOT NULL,
  destination_lng DOUBLE PRECISION NOT NULL,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active'
);

-- 4. Disable Row Level Security (RLS) & Grant Policies
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stops DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips DISABLE ROW LEVEL SECURITY;

-- Public Access Policies (Fallback)
DROP POLICY IF EXISTS "Allow all for users" ON public.users;
CREATE POLICY "Allow all for users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for stops" ON public.stops;
CREATE POLICY "Allow all for stops" ON public.stops FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for trips" ON public.trips;
CREATE POLICY "Allow all for trips" ON public.trips FOR ALL USING (true) WITH CHECK (true);

-- 5. Seed Initial Bus Corridor Stops
INSERT INTO public.stops (id, name, latitude, longitude) VALUES
  ('1', 'Coimbatore Gandhipuram Bus Stand', 11.0183, 76.9725),
  ('2', 'Tirupur Bus Stand', 11.1085, 77.3411),
  ('3', 'Erode Bus Stand', 11.341, 77.7172),
  ('4', 'Salem Central Bus Stand', 11.6643, 78.146),
  ('5', 'Krishnagiri Bus Stand', 12.5186, 78.2137),
  ('6', 'Vellore Bus Stand', 12.9165, 79.1325),
  ('7', 'Kanchipuram Bus Stand', 12.8342, 79.7036),
  ('8', 'Chennai Koyambedu (CMBT)', 13.0693, 80.1948)
ON CONFLICT (id) DO NOTHING;
