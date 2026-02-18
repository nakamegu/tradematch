-- ============================================================
-- Supabase Anonymous Auth + RLS Migration
-- Run this in the Supabase SQL Editor after enabling
-- Anonymous Sign-ins in Authentication > Providers
-- ============================================================

-- 1. Replace update_user_location RPC to use auth.uid() instead of parameter
CREATE OR REPLACE FUNCTION update_user_location(lat DOUBLE PRECISION, lng DOUBLE PRECISION)
RETURNS void AS $$
BEGIN
  UPDATE users SET
    location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    latitude = lat,
    longitude = lng
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop existing RLS policies (from initial schema) to avoid conflicts
DROP POLICY IF EXISTS "Users are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "User goods are viewable by everyone" ON user_goods;
DROP POLICY IF EXISTS "Users can manage own goods" ON user_goods;
DROP POLICY IF EXISTS "Goods are viewable by everyone" ON goods_master;
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;

-- 3. Enable RLS on all tables (idempotent)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goods ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_requests ENABLE ROW LEVEL SECURITY;

-- Helper: admin = non-anonymous authenticated user
-- auth.jwt() ->> 'is_anonymous' IS DISTINCT FROM 'true'

-- ============================================================
-- events: read=all, write=admin only
-- ============================================================
CREATE POLICY "events_select" ON events FOR SELECT USING (true);
CREATE POLICY "events_insert" ON events FOR INSERT
  WITH CHECK (auth.jwt() ->> 'is_anonymous' IS DISTINCT FROM 'true');
CREATE POLICY "events_update" ON events FOR UPDATE
  USING (auth.jwt() ->> 'is_anonymous' IS DISTINCT FROM 'true');
CREATE POLICY "events_delete" ON events FOR DELETE
  USING (auth.jwt() ->> 'is_anonymous' IS DISTINCT FROM 'true');

-- ============================================================
-- goods_master: read=all, write=admin only
-- ============================================================
CREATE POLICY "goods_master_select" ON goods_master FOR SELECT USING (true);
CREATE POLICY "goods_master_insert" ON goods_master FOR INSERT
  WITH CHECK (auth.jwt() ->> 'is_anonymous' IS DISTINCT FROM 'true');
CREATE POLICY "goods_master_update" ON goods_master FOR UPDATE
  USING (auth.jwt() ->> 'is_anonymous' IS DISTINCT FROM 'true');
CREATE POLICY "goods_master_delete" ON goods_master FOR DELETE
  USING (auth.jwt() ->> 'is_anonymous' IS DISTINCT FROM 'true');

-- ============================================================
-- users: read=all (needed for matching), write=own row only
-- ============================================================
CREATE POLICY "users_select" ON users FOR SELECT USING (true);
CREATE POLICY "users_insert" ON users FOR INSERT
  WITH CHECK (id = auth.uid());
CREATE POLICY "users_update" ON users FOR UPDATE
  USING (id = auth.uid());
CREATE POLICY "users_delete" ON users FOR DELETE
  USING (id = auth.uid());

-- ============================================================
-- user_goods: read=all (needed for matching), write=own rows only
-- ============================================================
CREATE POLICY "user_goods_select" ON user_goods FOR SELECT USING (true);
CREATE POLICY "user_goods_insert" ON user_goods FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_goods_update" ON user_goods FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "user_goods_delete" ON user_goods FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- matches: read/write=parties only (user1 or user2)
-- ============================================================
CREATE POLICY "matches_select" ON matches FOR SELECT
  USING (user1_id = auth.uid() OR user2_id = auth.uid());
CREATE POLICY "matches_insert" ON matches FOR INSERT
  WITH CHECK (user1_id = auth.uid());
CREATE POLICY "matches_update" ON matches FOR UPDATE
  USING (user1_id = auth.uid() OR user2_id = auth.uid());
CREATE POLICY "matches_delete" ON matches FOR DELETE
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- ============================================================
-- goods_requests: read=own+admin, insert=own, update/delete=admin
-- (column is "requested_by", not "user_id")
-- ============================================================
CREATE POLICY "goods_requests_select" ON goods_requests FOR SELECT
  USING (requested_by = auth.uid() OR auth.jwt() ->> 'is_anonymous' IS DISTINCT FROM 'true');
CREATE POLICY "goods_requests_insert" ON goods_requests FOR INSERT
  WITH CHECK (requested_by = auth.uid());
CREATE POLICY "goods_requests_update" ON goods_requests FOR UPDATE
  USING (auth.jwt() ->> 'is_anonymous' IS DISTINCT FROM 'true');
CREATE POLICY "goods_requests_delete" ON goods_requests FOR DELETE
  USING (auth.jwt() ->> 'is_anonymous' IS DISTINCT FROM 'true');
