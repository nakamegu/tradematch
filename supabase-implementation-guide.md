# トレマチ - Supabase連携実装ガイド

デモデータから本物のデータベースへ移行します。

## 🎯 実装する機能

### Phase 1: 基本的なSupabase連携
- [x] データベーススキーマ作成
- [ ] Supabaseクライアント設定
- [ ] イベント選択機能
- [ ] グッズ選択機能（画像付き）

### Phase 2: 画像アップロード
- [ ] Supabase Storage設定
- [ ] 画像アップロード機能
- [ ] グッズ画像の表示

### Phase 3: グッズリクエスト
- [ ] リクエスト送信機能
- [ ] 管理画面（承認・却下）

### Phase 4: リアルタイムマッチング
- [ ] 位置情報の定期更新
- [ ] マッチング検索API
- [ ] Realtime通知

---

## 📋 Step 1: Supabaseプロジェクトのセットアップ

### 1-1. Supabaseアカウント作成

1. https://supabase.com にアクセス
2. GitHubアカウントでサインアップ（または新規登録）
3. 「New Project」をクリック

### 1-2. プロジェクト作成

- **Name**: tradematch-mvp
- **Database Password**: 強力なパスワードを生成（保存しておく）
- **Region**: Northeast Asia (Tokyo)
- **Pricing Plan**: Free

作成完了まで2-3分待つ

### 1-3. データベーススキーマの実行

1. 左メニュー → **SQL Editor**
2. 「New Query」をクリック
3. `database-schema-complete.sql` の内容をコピペ
4. **Run** をクリック

✅ 成功すると「✅ データベースセットアップ完了！」と表示されます

### 1-4. RLSポリシーの追加（匿名アクセス用）

デフォルトのスキーマでは `auth.uid()` を使ったRLSポリシーのみ設定されています。
MVPでは認証なし（匿名）でアクセスするため、以下のSQLをSQL Editorで実行してください：

```sql
-- users テーブル: 匿名アクセスを許可
CREATE POLICY "Anyone can insert users" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update users" ON users
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete users" ON users
  FOR DELETE USING (true);

-- user_goods テーブル: 匿名アクセスを許可
CREATE POLICY "Anyone can insert user_goods" ON user_goods
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update user_goods" ON user_goods
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete user_goods" ON user_goods
  FOR DELETE USING (true);
```

-- matches テーブル: 匿名アクセスを許可
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read matches" ON matches
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert matches" ON matches
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update matches" ON matches
  FOR UPDATE USING (true);
```

⚠️ **注意**: これはMVP用の設定です。本番環境ではSupabase Authを導入し、`auth.uid()` ベースのポリシーに切り替えてください。

### 1-6. Realtimeの有効化

Supabase RealtimeでテーブルのINSERT/UPDATEをリアルタイム購読するには、対象テーブルのRealtimeを有効にする必要があります。

1. Supabaseダッシュボード → **Database** → **Replication**
2. **Source** セクションの `supabase_realtime` publication を確認
3. 以下のテーブルを有効化（トグルをON）：
   - `user_goods` — 新しいユーザーのグッズ登録をリアルタイム検知
   - `matches` — 交換リクエスト・ステータス変更をリアルタイム同期

または、SQL Editorで以下を実行：

```sql
-- Realtimeを有効化
ALTER PUBLICATION supabase_realtime ADD TABLE user_goods;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
```

✅ これにより、マッチングページで新規ユーザー登録時の自動再検索、交換リクエスト通知、識別ページでのステータス同期が有効になります。

### 1-5. 環境変数の取得

1. 左メニュー → **Project Settings** → **API**
2. 以下をコピー：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: `eyJhbGc...` (長い文字列)

---

## 📝 Step 2: プロジェクトにSupabaseを統合

### 2-1. 環境変数の設定

プロジェクトのルートに `.env.local` を作成：

```env
NEXT_PUBLIC_SUPABASE_URL=あなたのProject URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=あなたのanon public key
```

### 2-2. Supabaseクライアントの作成

`lib/supabase.ts` を作成：

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 型定義
export type Event = {
  id: string
  name: string
  artist_name: string
  event_date: string
  venue?: string
  image_url?: string
  is_active: boolean
}

export type GoodsMaster = {
  id: string
  event_id: string
  name: string
  category: string
  description?: string
  image_url?: string
  is_official: boolean
  status: string
}

export type UserGoods = {
  id: string
  user_id: string
  goods_id: string
  type: 'have' | 'want'
  quantity: number
}
```

---

## 🎨 Step 3: イベント選択機能の実装

### 3-1. イベント選択ページの作成

`app/select-event/page.tsx` を新規作成：

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Event } from '@/lib/supabase';

export default function SelectEventPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_active', true)
      .order('event_date', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  const handleSelectEvent = (eventId: string) => {
    localStorage.setItem('selectedEventId', eventId);
    router.push('/register');
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
        <div className="text-white text-2xl">読み込み中...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-4">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            イベントを選択
          </h1>
          <p className="text-gray-600">
            参加するイベントを選んでください
          </p>
        </div>

        <div className="space-y-4">
          {events.map((event) => (
            <button
              key={event.id}
              onClick={() => handleSelectEvent(event.id)}
              className="w-full bg-white rounded-3xl shadow-2xl p-6 text-left hover:shadow-xl transform hover:scale-105 transition-all"
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {event.name}
              </h2>
              <p className="text-purple-600 font-semibold mb-2">
                {event.artist_name}
              </p>
              {event.event_date && (
                <p className="text-gray-600 text-sm">
                  📅 {new Date(event.event_date).toLocaleDateString('ja-JP')}
                </p>
              )}
              {event.venue && (
                <p className="text-gray-600 text-sm">
                  📍 {event.venue}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
```

### 3-2. フローの修正

`app/page.tsx` を修正（ニックネーム入力後にイベント選択へ）：

```typescript
const handleStart = () => {
  if (nickname.trim()) {
    localStorage.setItem('nickname', nickname);
    router.push('/select-event'); // ← ここを変更
  }
};
```

---

## 🎁 Step 4: グッズ選択機能の実装（画像付き）

### 4-1. グッズ取得機能

`app/register/page.tsx` を大幅に修正：

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, GoodsMaster } from '@/lib/supabase';
import Image from 'next/image';

export default function RegisterPage() {
  const [goods, setGoods] = useState<GoodsMaster[]>([]);
  const [haveGoods, setHaveGoods] = useState<string[]>([]);
  const [wantGoods, setWantGoods] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState('');
  const router = useRouter();

  useEffect(() => {
    const eventId = localStorage.getItem('selectedEventId');
    if (!eventId) {
      router.push('/select-event');
      return;
    }
    fetchGoods(eventId);
  }, [router]);

  const fetchGoods = async (eventId: string) => {
    // イベント情報を取得
    const { data: eventData } = await supabase
      .from('events')
      .select('name')
      .eq('id', eventId)
      .single();

    if (eventData) {
      setEventName(eventData.name);
    }

    // グッズ一覧を取得
    const { data, error } = await supabase
      .from('goods_master')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'active')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching goods:', error);
    } else {
      setGoods(data || []);
    }
    setLoading(false);
  };

  const toggleHaveGood = (goodsId: string) => {
    if (haveGoods.includes(goodsId)) {
      setHaveGoods(haveGoods.filter(g => g !== goodsId));
    } else {
      setHaveGoods([...haveGoods, goodsId]);
    }
  };

  const toggleWantGood = (goodsId: string) => {
    if (wantGoods.includes(goodsId)) {
      setWantGoods(wantGoods.filter(g => g !== goodsId));
    } else {
      setWantGoods([...wantGoods, goodsId]);
    }
  };

  const handleNext = () => {
    if (haveGoods.length > 0 && wantGoods.length > 0) {
      localStorage.setItem('haveGoodsIds', JSON.stringify(haveGoods));
      localStorage.setItem('wantGoodsIds', JSON.stringify(wantGoods));
      router.push('/matching');
    }
  };

  // カテゴリーごとにグループ化
  const groupedGoods = goods.reduce((acc, good) => {
    const category = good.category || 'その他';
    if (!acc[category]) acc[category] = [];
    acc[category].push(good);
    return acc;
  }, {} as Record<string, GoodsMaster[]>);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-500">
        <div className="text-white text-2xl">読み込み中...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-4">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">グッズ登録</h1>
          <p className="text-gray-600">{eventName}</p>
        </div>

        {/* 持っているグッズ */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-4">
          <h2 className="text-2xl font-bold text-purple-600 mb-4 flex items-center gap-2">
            ✅ 持っているグッズ
            <span className="text-sm font-normal text-gray-500">
              ({haveGoods.length}個選択中)
            </span>
          </h2>
          
          {Object.entries(groupedGoods).map(([category, items]) => (
            <div key={category} className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">
                {category}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {items.map((good) => (
                  <button
                    key={good.id}
                    onClick={() => toggleHaveGood(good.id)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      haveGoods.includes(good.id)
                        ? 'bg-purple-100 border-purple-500'
                        : 'bg-gray-50 border-gray-300 hover:border-purple-300'
                    }`}
                  >
                    {good.image_url && (
                      <div className="relative w-full h-24 mb-2">
                        <Image
                          src={good.image_url}
                          alt={good.name}
                          fill
                          className="object-cover rounded-lg"
                        />
                      </div>
                    )}
                    <p className="text-sm font-medium text-gray-800">
                      {good.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 欲しいグッズ */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-4">
          <h2 className="text-2xl font-bold text-pink-600 mb-4 flex items-center gap-2">
            ❤️ 欲しいグッズ
            <span className="text-sm font-normal text-gray-500">
              ({wantGoods.length}個選択中)
            </span>
          </h2>
          
          {Object.entries(groupedGoods).map(([category, items]) => (
            <div key={category} className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">
                {category}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {items.map((good) => (
                  <button
                    key={good.id}
                    onClick={() => toggleWantGood(good.id)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      wantGoods.includes(good.id)
                        ? 'bg-pink-100 border-pink-500'
                        : 'bg-gray-50 border-gray-300 hover:border-pink-300'
                    }`}
                  >
                    {good.image_url && (
                      <div className="relative w-full h-24 mb-2">
                        <Image
                          src={good.image_url}
                          alt={good.name}
                          fill
                          className="object-cover rounded-lg"
                        />
                      </div>
                    )}
                    <p className="text-sm font-medium text-gray-800">
                      {good.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* グッズリクエストボタン */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-4">
          <p className="text-gray-700 mb-3">
            探しているグッズが見つかりませんか？
          </p>
          <button
            onClick={() => router.push('/request-goods')}
            className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          >
            📝 グッズを追加リクエスト
          </button>
        </div>

        {/* 次へボタン */}
        <button
          onClick={handleNext}
          disabled={haveGoods.length === 0 || wantGoods.length === 0}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          マッチング開始 →
        </button>
      </div>
    </main>
  );
}
```

---

## 📸 Step 5: 画像アップロード機能

### 5-1. Supabase Storageの設定

1. Supabaseダッシュボード → **Storage**
2. 「Create a new bucket」
3. **Name**: `goods-images`
4. **Public bucket**: ON（画像を公開）
5. 「Save」

### 5-2. ストレージポリシーの設定

Storage → goods-images → Policies → New Policy

```sql
-- 誰でも読み取り可能
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'goods-images' );

-- 認証ユーザーはアップロード可能
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'goods-images' AND auth.role() = 'authenticated' );
```

### 5-3. 画像アップロードユーティリティ

`lib/upload.ts` を作成：

```typescript
import { supabase } from './supabase';

export async function uploadGoodsImage(file: File): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `goods/${fileName}`;

  const { error } = await supabase.storage
    .from('goods-images')
    .upload(filePath, file);

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  // 公開URLを取得
  const { data } = supabase.storage
    .from('goods-images')
    .getPublicUrl(filePath);

  return data.publicUrl;
}
```

---

## 🚀 Step 6: デプロイ前のチェックリスト

- [ ] `.env.local` が `.gitignore` に含まれている
- [ ] Supabaseの環境変数がVercelに設定されている
- [ ] 全ての機能が localhost で動作確認済み
- [ ] 画像アップロードのテスト完了
- [ ] マッチングロジックのテスト完了

---

## 🆘 トラブルシューティング

### エラー: "relation does not exist"
→ SQLスクリプトが正しく実行されていません。SQL Editorで再実行してください。

### エラー: "Invalid API key"
→ `.env.local` の値が正しくコピーされていません。Project SettingsのAPIから再取得してください。

### 画像が表示されない
→ Storage のバケットが public になっているか確認してください。

---

次は実際にSupabaseをセットアップして、一緒に実装していきましょう！
どこから始めますか？
