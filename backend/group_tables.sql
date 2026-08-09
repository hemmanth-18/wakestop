-- WakeStop Group Travel Mode Tables
-- Run this in Supabase SQL Editor

-- Groups table: one row per active group trip
CREATE TABLE IF NOT EXISTS groups (
  id              BIGSERIAL PRIMARY KEY,
  code            VARCHAR(6)   NOT NULL UNIQUE,   -- e.g. "WS4821"
  pin             VARCHAR(6)   NOT NULL,           -- 6-digit numeric PIN set by host
  host_user_id    TEXT         NOT NULL,
  destination_name TEXT        NOT NULL,
  destination_lat  DOUBLE PRECISION NOT NULL,
  destination_lng  DOUBLE PRECISION NOT NULL,
  alarm_stage     TEXT         DEFAULT NULL,       -- NULL | stage1_1km | stage2_500m | stage3_100m | arrived
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ  NOT NULL
);

-- Group members table: one row per member per group
CREATE TABLE IF NOT EXISTS group_members (
  id              BIGSERIAL PRIMARY KEY,
  group_code      VARCHAR(6)   NOT NULL REFERENCES groups(code) ON DELETE CASCADE,
  user_id         TEXT         NOT NULL,
  display_name    TEXT         NOT NULL DEFAULT 'Member',
  lat             DOUBLE PRECISION DEFAULT NULL,
  lng             DOUBLE PRECISION DEFAULT NULL,
  last_updated    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (group_code, user_id)
);

-- Index for fast polling
CREATE INDEX IF NOT EXISTS idx_groups_code ON groups(code);
CREATE INDEX IF NOT EXISTS idx_group_members_code ON group_members(group_code);

-- Auto-cleanup expired groups (optional: run as a scheduled Supabase function)
-- DELETE FROM groups WHERE expires_at < NOW();
