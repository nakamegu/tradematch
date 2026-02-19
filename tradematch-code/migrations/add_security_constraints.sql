-- ============================================================
-- セキュリティ強化: 文字数制限・行数制限・重複防止
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. ニックネーム長制限 (20文字以内)
ALTER TABLE users ADD CONSTRAINT users_nickname_length
  CHECK (char_length(nickname) <= 20);

-- 2. チャットメッセージ長制限 (500文字以内)
ALTER TABLE match_messages ADD CONSTRAINT match_messages_message_length
  CHECK (char_length(message) <= 500);

-- 3. マッチング重複防止: 同じ相手へのpendingマッチは1件まで
--    (user1_id, user2_id) で status='pending' のユニーク制約
CREATE UNIQUE INDEX idx_matches_unique_pending
  ON matches (user1_id, user2_id)
  WHERE status = 'pending';

-- 4. user_goods 行数制限: 1ユーザーあたり最大200行
CREATE OR REPLACE FUNCTION check_user_goods_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT count(*) FROM user_goods WHERE user_id = NEW.user_id) >= 200 THEN
    RAISE EXCEPTION 'User goods limit exceeded (max 200 rows per user)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_goods_limit ON user_goods;
CREATE TRIGGER trigger_user_goods_limit
  BEFORE INSERT ON user_goods
  FOR EACH ROW EXECUTE FUNCTION check_user_goods_limit();

-- 5. Storage: goods-images バケットのポリシー
--    (注意: これはSupabase Dashboard > Storage > Policies でも設定可能)
--    アップロード/更新/削除を非匿名ユーザー(admin)に限定
INSERT INTO storage.policies (name, bucket_id, operation, definition)
SELECT 'admin_upload', 'goods-images', 'INSERT',
  '(auth.jwt() ->> ''is_anonymous'' IS DISTINCT FROM ''true'')'
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies WHERE name = 'admin_upload' AND bucket_id = 'goods-images'
);
-- ↑ storage.policies テーブルが無い場合は、Supabase Dashboard から手動設定してください:
--   Storage > goods-images > Policies > New policy
--   - Operation: INSERT (upload)
--   - Policy: auth.jwt() ->> 'is_anonymous' IS DISTINCT FROM 'true'
--   ※ SELECT (download) は public bucket なら不要
