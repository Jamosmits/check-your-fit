-- Check Your Fit - PostgreSQL Schema
-- Run this file against your PostgreSQL database to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- HOUSEHOLDS
-- ============================================================
CREATE TABLE IF NOT EXISTS households (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  invite_code   VARCHAR(12) NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_households_invite_code ON households (invite_code);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id   UUID REFERENCES households (id) ON DELETE SET NULL,
  email          VARCHAR(320) NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  display_name   VARCHAR(100) NOT NULL,
  avatar_url     TEXT,
  role           VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email        ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_household_id ON users (household_id);

-- ============================================================
-- CLOTHING ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS clothing_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  household_id    UUID REFERENCES households (id) ON DELETE SET NULL,
  name            VARCHAR(255) NOT NULL,
  category        VARCHAR(50) NOT NULL,          -- tops, bottoms, shoes, outerwear, accessories, underwear, etc.
  subcategory     VARCHAR(50),
  color           VARCHAR(50),
  colors          TEXT[],                        -- multiple colours detected
  brand           VARCHAR(100),
  size            VARCHAR(20),
  material        VARCHAR(100),
  pattern         VARCHAR(50),
  formality       VARCHAR(20),                   -- casual, smart-casual, formal, athletic
  season          TEXT[],                        -- spring, summer, autumn, winter
  tags            TEXT[],
  image_url       TEXT,
  thumbnail_url   TEXT,
  original_image_url TEXT,
  wear_count      INTEGER NOT NULL DEFAULT 0,
  last_worn_at    TIMESTAMPTZ,
  purchase_date   DATE,
  purchase_price  NUMERIC(10, 2),
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  ai_metadata     JSONB,                         -- raw GPT-4o Vision output
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clothing_items_user_id      ON clothing_items (user_id);
CREATE INDEX IF NOT EXISTS idx_clothing_items_household_id ON clothing_items (household_id);
CREATE INDEX IF NOT EXISTS idx_clothing_items_category     ON clothing_items (category);
CREATE INDEX IF NOT EXISTS idx_clothing_items_is_active    ON clothing_items (is_active);
CREATE INDEX IF NOT EXISTS idx_clothing_items_season       ON clothing_items USING GIN (season);
CREATE INDEX IF NOT EXISTS idx_clothing_items_tags         ON clothing_items USING GIN (tags);

-- ============================================================
-- OUTFITS
-- ============================================================
CREATE TABLE IF NOT EXISTS outfits (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  household_id    UUID REFERENCES households (id) ON DELETE SET NULL,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  item_ids        UUID[] NOT NULL,               -- ordered list of clothing item IDs
  occasion        VARCHAR(50),                   -- work, casual, date, sport, travel, formal
  season          TEXT[],
  weather_min     INTEGER,                       -- minimum °C comfort range
  weather_max     INTEGER,                       -- maximum °C comfort range
  formality       VARCHAR(20),
  tags            TEXT[],
  image_url       TEXT,                          -- optional composite/cover photo
  wear_count      INTEGER NOT NULL DEFAULT 0,
  last_worn_at    TIMESTAMPTZ,
  is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  ai_metadata     JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outfits_user_id      ON outfits (user_id);
CREATE INDEX IF NOT EXISTS idx_outfits_household_id ON outfits (household_id);
CREATE INDEX IF NOT EXISTS idx_outfits_occasion     ON outfits (occasion);
CREATE INDEX IF NOT EXISTS idx_outfits_season       ON outfits USING GIN (season);
CREATE INDEX IF NOT EXISTS idx_outfits_item_ids     ON outfits USING GIN (item_ids);

-- ============================================================
-- SCAN JOBS
-- ============================================================
CREATE TABLE IF NOT EXISTS scan_jobs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'awaiting_confirmation', 'completed', 'failed')),
  progress        INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  source_urls     TEXT[] NOT NULL,               -- uploaded image / video URLs
  detected_items  JSONB,                         -- array of raw AI-detected item objects
  confirmed_items UUID[],                        -- clothing_item IDs after user confirms
  error_message   TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_jobs_user_id ON scan_jobs (user_id);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_status  ON scan_jobs (status);

-- ============================================================
-- TRIPS
-- ============================================================
CREATE TABLE IF NOT EXISTS trips (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id    UUID NOT NULL REFERENCES households (id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  destination     VARCHAR(255) NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  activities      TEXT[],                        -- beach, hiking, city, formal-dinner, etc.
  traveler_ids    UUID[] NOT NULL,               -- user IDs joining the trip
  packlist        JSONB,                         -- { userId: { itemId: boolean } }
  weather_cache   JSONB,                         -- cached weather forecast
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_household_id ON trips (household_id);
CREATE INDEX IF NOT EXISTS idx_trips_created_by   ON trips (created_by);
CREATE INDEX IF NOT EXISTS idx_trips_start_date   ON trips (start_date);
CREATE INDEX IF NOT EXISTS idx_trips_traveler_ids ON trips USING GIN (traveler_ids);

-- ============================================================
-- SHOPPING SUGGESTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS shopping_suggestions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  household_id    UUID REFERENCES households (id) ON DELETE SET NULL,
  trip_id         UUID REFERENCES trips (id) ON DELETE SET NULL,
  name            VARCHAR(255) NOT NULL,
  category        VARCHAR(50),
  reason          TEXT,                          -- why AI suggests this
  priority        VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  affiliate_links JSONB,                         -- [{ store, url, price, currency }]
  is_dismissed    BOOLEAN NOT NULL DEFAULT FALSE,
  is_purchased    BOOLEAN NOT NULL DEFAULT FALSE,
  ai_metadata     JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopping_suggestions_user_id      ON shopping_suggestions (user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_suggestions_household_id ON shopping_suggestions (household_id);
CREATE INDEX IF NOT EXISTS idx_shopping_suggestions_trip_id      ON shopping_suggestions (trip_id);
CREATE INDEX IF NOT EXISTS idx_shopping_suggestions_is_dismissed ON shopping_suggestions (is_dismissed);

-- ============================================================
-- OUTFIT CALENDAR
-- ============================================================
CREATE TABLE IF NOT EXISTS outfit_calendar (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  outfit_id  UUID REFERENCES outfits (id) ON DELETE SET NULL,
  item_ids   UUID[],                             -- direct items if no outfit
  worn_date  DATE NOT NULL,
  notes      TEXT,
  weather    JSONB,                              -- { temp, condition, humidity }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_outfit_calendar_user_date ON outfit_calendar (user_id, worn_date);
CREATE INDEX IF NOT EXISTS idx_outfit_calendar_user_id  ON outfit_calendar (user_id);
CREATE INDEX IF NOT EXISTS idx_outfit_calendar_outfit_id ON outfit_calendar (outfit_id);
CREATE INDEX IF NOT EXISTS idx_outfit_calendar_worn_date ON outfit_calendar (worn_date);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'households', 'users', 'clothing_items', 'outfits',
    'scan_jobs', 'trips', 'shopping_suggestions', 'outfit_calendar'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON %I;
       CREATE TRIGGER set_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      t, t
    );
  END LOOP;
END;
$$;
