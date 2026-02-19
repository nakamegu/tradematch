-- ============================================================
-- match_messages テーブル: マッチ成立後のチャット
-- Run this in the Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS match_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_messages_match_id ON match_messages(match_id);

-- RLS
ALTER TABLE match_messages ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is a party of the match
CREATE OR REPLACE FUNCTION is_match_party(mid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM matches
    WHERE id = mid
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- SELECT: match parties only
DROP POLICY IF EXISTS "match_messages_select" ON match_messages;
CREATE POLICY "match_messages_select" ON match_messages
  FOR SELECT USING (is_match_party(match_id));

-- INSERT: match parties only, sender must be self
DROP POLICY IF EXISTS "match_messages_insert" ON match_messages;
CREATE POLICY "match_messages_insert" ON match_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND is_match_party(match_id)
  );

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE match_messages;
