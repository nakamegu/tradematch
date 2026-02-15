-- トレマチ データベーススキーマ（完全版）
-- Supabaseで実行してください

-- PostGIS拡張を有効化（位置情報検索用）
CREATE EXTENSION IF NOT EXISTS postgis;

-- ==========================================
-- 1. イベント/アーティストマスタ
-- ==========================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,              -- イベント名（例: "○○ライブ 2024"）
  artist_name VARCHAR(200) NOT NULL,       -- アーティスト名
  event_date DATE,                          -- イベント日
  venue VARCHAR(200),                       -- 会場
  image_url TEXT,                           -- イベント画像
  is_active BOOLEAN DEFAULT true,          -- アクティブフラグ
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX events_artist_name_idx ON events(artist_name);
CREATE INDEX events_is_active_idx ON events(is_active);

-- ==========================================
-- 2. グッズマスタ（運営登録 + 承認済み）
-- ==========================================
CREATE TABLE goods_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,              -- グッズ名
  category VARCHAR(50),                     -- カテゴリー（キーホルダー、ステッカー等）
  description TEXT,                         -- 説明
  image_url TEXT,                           -- グッズ画像URL
  is_official BOOLEAN DEFAULT true,        -- 運営登録かユーザー投稿か
  status VARCHAR(20) DEFAULT 'active',     -- active, pending, rejected
  created_by UUID,                          -- 作成者（ユーザーID）
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(event_id, name)                   -- 同じイベント内で重複を防ぐ
);

CREATE INDEX goods_master_event_id_idx ON goods_master(event_id);
CREATE INDEX goods_master_status_idx ON goods_master(status);
CREATE INDEX goods_master_category_idx ON goods_master(category);

-- ==========================================
-- 3. グッズリクエスト（ユーザーからの追加申請）
-- ==========================================
CREATE TABLE goods_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50),
  description TEXT,
  image_url TEXT,                           -- ユーザーがアップロードした画像
  requested_by UUID NOT NULL,               -- リクエストしたユーザー
  status VARCHAR(20) DEFAULT 'pending',    -- pending, approved, rejected
  admin_note TEXT,                          -- 運営のメモ
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewed_by UUID
);

CREATE INDEX goods_requests_event_id_idx ON goods_requests(event_id);
CREATE INDEX goods_requests_status_idx ON goods_requests(status);
CREATE INDEX goods_requests_requested_by_idx ON goods_requests(requested_by);

-- ==========================================
-- 4. ユーザーテーブル
-- ==========================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname VARCHAR(50) NOT NULL,
  location GEOGRAPHY(POINT, 4326),         -- PostGIS型（位置情報）
  is_active BOOLEAN DEFAULT true,          -- マッチング中かどうか
  last_active TIMESTAMP DEFAULT NOW(),     -- 最終アクティブ時刻
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX users_location_idx ON users USING GIST (location);
CREATE INDEX users_is_active_idx ON users(is_active);
CREATE INDEX users_last_active_idx ON users(last_active);

-- ==========================================
-- 5. ユーザーのグッズ（持っている・欲しい）
-- ==========================================
CREATE TABLE user_goods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  goods_id UUID REFERENCES goods_master(id) ON DELETE CASCADE,
  type VARCHAR(10) CHECK (type IN ('have', 'want')),
  quantity INTEGER DEFAULT 1,              -- 複数個持っている場合
  notes TEXT,                               -- メモ（状態など）
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, goods_id, type)          -- 同じグッズを重複登録しない
);

CREATE INDEX user_goods_user_id_idx ON user_goods(user_id);
CREATE INDEX user_goods_goods_id_idx ON user_goods(goods_id);
CREATE INDEX user_goods_type_idx ON user_goods(type);

-- ==========================================
-- 6. マッチング履歴
-- ==========================================
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID REFERENCES users(id),
  user2_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending',    -- pending, accepted, completed, cancelled
  color_code VARCHAR(7),                    -- 識別カラーコード
  matched_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  CHECK (user1_id != user2_id)             -- 自分自身とマッチングしない
);

CREATE INDEX matches_user1_id_idx ON matches(user1_id);
CREATE INDEX matches_user2_id_idx ON matches(user2_id);
CREATE INDEX matches_status_idx ON matches(status);

-- ==========================================
-- 7. 交換履歴（評価付き）
-- ==========================================
CREATE TABLE exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  user1_id UUID REFERENCES users(id),
  user2_id UUID REFERENCES users(id),
  -- ユーザー1の評価
  user1_rating INTEGER CHECK (user1_rating >= 1 AND user1_rating <= 5),
  user1_comment TEXT,
  -- ユーザー2の評価
  user2_rating INTEGER CHECK (user2_rating >= 1 AND user2_rating <= 5),
  user2_comment TEXT,
  completed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX exchanges_match_id_idx ON exchanges(match_id);
CREATE INDEX exchanges_user1_id_idx ON exchanges(user1_id);
CREATE INDEX exchanges_user2_id_idx ON exchanges(user2_id);

-- ==========================================
-- 8. 画像ストレージ管理
-- ==========================================
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,                 -- Supabase Storage のパス
  file_size INTEGER,                        -- バイト数
  mime_type VARCHAR(50),
  uploaded_by UUID,
  entity_type VARCHAR(50),                  -- 'event', 'goods', 'request'
  entity_id UUID,                           -- 関連するエンティティのID
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX images_entity_idx ON images(entity_type, entity_id);
CREATE INDEX images_uploaded_by_idx ON images(uploaded_by);

-- ==========================================
-- 便利な関数
-- ==========================================

-- 近くのアクティブユーザーを検索
CREATE OR REPLACE FUNCTION find_nearby_users(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  max_distance INTEGER,
  exclude_user_id UUID
)
RETURNS TABLE (
  id UUID,
  nickname VARCHAR,
  distance DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.nickname,
    ST_Distance(
      u.location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) AS distance
  FROM users u
  WHERE
    u.is_active = true
    AND u.id != exclude_user_id
    AND u.last_active > NOW() - INTERVAL '30 minutes'  -- 30分以内にアクティブ
    AND ST_DWithin(
      u.location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      max_distance
    )
  ORDER BY distance ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- マッチング候補を検索（相互に交換可能なユーザーを見つける）
CREATE OR REPLACE FUNCTION find_matching_users(
  current_user_id UUID,
  max_distance INTEGER DEFAULT 200
)
RETURNS TABLE (
  matched_user_id UUID,
  nickname VARCHAR,
  distance DOUBLE PRECISION,
  match_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH current_user_location AS (
    SELECT location FROM users WHERE id = current_user_id
  ),
  my_wants AS (
    SELECT goods_id FROM user_goods 
    WHERE user_id = current_user_id AND type = 'want'
  ),
  my_haves AS (
    SELECT goods_id FROM user_goods 
    WHERE user_id = current_user_id AND type = 'have'
  )
  SELECT
    u.id AS matched_user_id,
    u.nickname,
    ST_Distance(
      u.location,
      (SELECT location FROM current_user_location)
    ) AS distance,
    COUNT(DISTINCT CASE WHEN ug_have.goods_id IN (SELECT goods_id FROM my_wants) THEN ug_have.goods_id END) AS match_count
  FROM users u
  INNER JOIN user_goods ug_have ON u.id = ug_have.user_id AND ug_have.type = 'have'
  INNER JOIN user_goods ug_want ON u.id = ug_want.user_id AND ug_want.type = 'want'
  WHERE
    u.id != current_user_id
    AND u.is_active = true
    AND u.last_active > NOW() - INTERVAL '30 minutes'
    AND ST_DWithin(
      u.location,
      (SELECT location FROM current_user_location),
      max_distance
    )
    -- 相手が持っていて自分が欲しい
    AND ug_have.goods_id IN (SELECT goods_id FROM my_wants)
    -- 自分が持っていて相手が欲しい
    AND ug_want.goods_id IN (SELECT goods_id FROM my_haves)
  GROUP BY u.id, u.nickname, u.location
  HAVING COUNT(DISTINCT CASE WHEN ug_have.goods_id IN (SELECT goods_id FROM my_wants) THEN ug_have.goods_id END) > 0
  ORDER BY distance ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Row Level Security (RLS) の設定
-- ==========================================

-- ユーザーは自分のデータのみ編集可能
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goods ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み取り可能（マッチングに必要）
CREATE POLICY "Users are viewable by everyone" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "User goods are viewable by everyone" ON user_goods
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own goods" ON user_goods
  FOR ALL USING (auth.uid() = user_id);

-- グッズマスタは全員が読める
ALTER TABLE goods_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Goods are viewable by everyone" ON goods_master
  FOR SELECT USING (status = 'active');

-- イベントは全員が読める
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events are viewable by everyone" ON events
  FOR SELECT USING (is_active = true);

-- ==========================================
-- 初期データ（サンプル）
-- ==========================================

-- サンプルイベント
INSERT INTO events (name, artist_name, event_date, is_active) VALUES
  ('夏フェス 2024 東京公演', 'アーティストA', '2024-08-15', true),
  ('ワンマンライブ 2024', 'アーティストB', '2024-09-20', true),
  ('全国ツアー 2024 大阪', 'アーティストC', '2024-10-05', true);

-- サンプルグッズ（最初のイベント用）
INSERT INTO goods_master (event_id, name, category, is_official) 
SELECT 
  e.id,
  goods.name,
  goods.category,
  true
FROM events e
CROSS JOIN (VALUES
  ('キーホルダーA', 'キーホルダー'),
  ('キーホルダーB', 'キーホルダー'),
  ('キーホルダーC', 'キーホルダー'),
  ('ステッカーA', 'ステッカー'),
  ('ステッカーB', 'ステッカー'),
  ('ステッカーC', 'ステッカー'),
  ('ポストカードA', 'ポストカード'),
  ('ポストカードB', 'ポストカード'),
  ('ポストカードC', 'ポストカード'),
  ('バッジA', 'バッジ'),
  ('バッジB', 'バッジ'),
  ('バッジC', 'バッジ'),
  ('タオルA', 'タオル'),
  ('タオルB', 'タオル'),
  ('タオルC', 'タオル'),
  ('ペンライトA', 'ペンライト'),
  ('ペンライトB', 'ペンライト'),
  ('ペンライトC', 'ペンライト'),
  ('Tシャツ', 'アパレル'),
  ('トートバッグ', 'バッグ'),
  ('クリアファイル', '文房具')
) AS goods(name, category)
WHERE e.name = '夏フェス 2024 東京公演';

-- ==========================================
-- 完了！
-- ==========================================

-- 確認用クエリ
SELECT '✅ データベースセットアップ完了！' AS status;
SELECT COUNT(*) AS event_count FROM events;
SELECT COUNT(*) AS goods_count FROM goods_master;
