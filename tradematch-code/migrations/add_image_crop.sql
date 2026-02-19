-- goods_master に image_crop カラムを追加
-- 形式: { x, y, width, height, naturalWidth, naturalHeight } (ネイティブピクセル座標)
ALTER TABLE goods_master ADD COLUMN IF NOT EXISTS image_crop JSONB;
