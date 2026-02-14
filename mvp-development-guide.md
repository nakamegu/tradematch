# トレマチ MVP プロトタイプ開発ガイド

## 🎯 MVP の目標

**検証したいこと:**
- ライブ会場で近くの人とマッチングできるか
- カラーコードで相手を見つけられるか
- グッズ登録のUXが簡単か

**含まれる機能:**
1. ✅ グッズ登録（持ってる・欲しい）
2. ✅ 位置情報マッチング
3. ✅ 識別マーク表示（カラーコード）

**含まれない機能（後で追加）:**
- ❌ ユーザー認証（ニックネーム入力のみ）
- ❌ 交換完了・評価
- ❌ チャット機能
- ❌ プッシュ通知

---

## 🏗️ アーキテクチャ

### フロントエンド
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **PWA対応**

### バックエンド
- **Next.js API Routes** (最初はこれで十分)
- **Supabase** (リアルタイムDB + 位置情報検索)
  - または **Firebase Realtime Database**

### 位置情報処理
- **Geolocation API** (ブラウザ標準)
- **PostGIS** または **Supabase の postgis 拡張**

---

## 📦 必要なパッケージ

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@supabase/supabase-js": "^2.38.0",
    "zustand": "^4.4.0",
    "next-pwa": "^5.6.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/react": "^18.2.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

---

## 📁 プロジェクト構造

```
tradematch-mvp/
├── app/
│   ├── page.tsx              # ランディング（ニックネーム入力）
│   ├── register/
│   │   └── page.tsx          # グッズ登録画面
│   ├── matching/
│   │   └── page.tsx          # マッチング検索画面
│   ├── identify/
│   │   └── page.tsx          # 識別マーク表示画面
│   └── api/
│       ├── users/route.ts    # ユーザー作成
│       ├── goods/route.ts    # グッズ登録
│       └── match/route.ts    # マッチング検索
├── components/
│   ├── GoodsSelector.tsx     # グッズ選択コンポーネント
│   ├── ColorCode.tsx         # カラーコード表示
│   └── MatchCard.tsx         # マッチング結果カード
├── lib/
│   ├── supabase.ts           # Supabase クライアント
│   ├── geolocation.ts        # 位置情報取得
│   └── matching.ts           # マッチングロジック
└── store/
    └── userStore.ts          # グローバルステート管理
```

---

## 🗄️ データベーススキーマ（Supabase）

### テーブル1: users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname VARCHAR(50) NOT NULL,
  location GEOGRAPHY(POINT, 4326), -- PostGIS型
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 位置情報検索用のインデックス
CREATE INDEX users_location_idx ON users USING GIST (location);
```

### テーブル2: goods
```sql
CREATE TABLE goods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(10) CHECK (type IN ('have', 'want')),
  item_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX goods_user_id_idx ON goods(user_id);
CREATE INDEX goods_type_idx ON goods(type);
```

### テーブル3: matches
```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID REFERENCES users(id),
  user2_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, completed
  color_code VARCHAR(7), -- 識別カラーコード（例: #FF5733）
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔑 主要な実装ポイント

### 1. 位置情報取得（lib/geolocation.ts）

```typescript
export async function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

export function watchLocation(
  callback: (location: { latitude: number; longitude: number }) => void
): number {
  return navigator.geolocation.watchPosition(
    (position) => {
      callback({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    },
    (error) => console.error('Location error:', error),
    {
      enableHighAccuracy: true,
      maximumAge: 30000, // 30秒キャッシュ
    }
  );
}
```

### 2. マッチングロジック（lib/matching.ts）

```typescript
import { supabase } from './supabase';

interface MatchResult {
  userId: string;
  nickname: string;
  distance: number;
  matchedItems: {
    theyHave: string[];
    youWant: string[];
  };
}

export async function findMatches(
  currentUserId: string,
  currentLocation: { latitude: number; longitude: number },
  maxDistance: number = 200 // メートル
): Promise<MatchResult[]> {
  // 1. 自分の欲しいグッズを取得
  const { data: myWants } = await supabase
    .from('goods')
    .select('item_name')
    .eq('user_id', currentUserId)
    .eq('type', 'want');

  const myWantItems = myWants?.map((g) => g.item_name) || [];

  // 2. 近くのアクティブユーザーを検索（PostGIS使用）
  const { data: nearbyUsers } = await supabase.rpc('find_nearby_users', {
    lat: currentLocation.latitude,
    lng: currentLocation.longitude,
    max_distance: maxDistance,
    exclude_user_id: currentUserId,
  });

  if (!nearbyUsers) return [];

  // 3. 各ユーザーのグッズをチェックしてマッチング判定
  const matches: MatchResult[] = [];

  for (const user of nearbyUsers) {
    const { data: theirHave } = await supabase
      .from('goods')
      .select('item_name')
      .eq('user_id', user.id)
      .eq('type', 'have');

    const { data: theirWant } = await supabase
      .from('goods')
      .select('item_name')
      .eq('user_id', user.id)
      .eq('type', 'want');

    const theirHaveItems = theirHave?.map((g) => g.item_name) || [];
    const theirWantItems = theirWant?.map((g) => g.item_name) || [];

    // 自分の欲しいものを相手が持っている
    const matchedItems = theirHaveItems.filter((item) =>
      myWantItems.includes(item)
    );

    // さらに、相手の欲しいものを自分が持っているかチェック
    const { data: myHave } = await supabase
      .from('goods')
      .select('item_name')
      .eq('user_id', currentUserId)
      .eq('type', 'have');

    const myHaveItems = myHave?.map((g) => g.item_name) || [];
    const reverseMatch = theirWantItems.filter((item) =>
      myHaveItems.includes(item)
    );

    // 相互マッチングがあれば結果に追加
    if (matchedItems.length > 0 && reverseMatch.length > 0) {
      matches.push({
        userId: user.id,
        nickname: user.nickname,
        distance: user.distance,
        matchedItems: {
          theyHave: matchedItems,
          youWant: reverseMatch,
        },
      });
    }
  }

  return matches;
}
```

### 3. 近くのユーザー検索（SQL関数）

```sql
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
    AND ST_DWithin(
      u.location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      max_distance
    )
  ORDER BY distance ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;
```

### 4. カラーコード生成

```typescript
export function generateColorCode(): string {
  const colors = [
    '#FF6B6B', // 赤
    '#4ECDC4', // 青緑
    '#FFE66D', // 黄色
    '#95E1D3', // ミント
    '#F38181', // ピンク
    '#AA96DA', // 紫
    '#FCBAD3', // ライトピンク
    '#A8D8EA', // 水色
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
```

---

## 🎨 UI実装例

### 識別マーク表示画面（app/identify/page.tsx）

```typescript
'use client';

import { useEffect, useState } from 'react';
import { generateColorCode } from '@/lib/matching';

export default function IdentifyPage() {
  const [colorCode, setColorCode] = useState<string>('#FF6B6B');
  const [nickname, setNickname] = useState<string>('');

  useEffect(() => {
    // マッチング成立時にカラーコードを生成
    const code = generateColorCode();
    setColorCode(code);
    
    // ニックネームを取得（ストアから）
    // setNickname(userStore.nickname);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{ backgroundColor: colorCode }}
    >
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4">交換相手を見つけてください</h1>
        
        <div className="my-8">
          <div className="text-6xl mb-4">👋</div>
          <p className="text-2xl font-bold">{nickname || 'あなた'}</p>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-100 rounded-2xl p-6">
            <p className="text-sm text-gray-600 mb-2">識別コード</p>
            <div
              className="w-32 h-32 mx-auto rounded-2xl shadow-lg"
              style={{ backgroundColor: colorCode }}
            />
            <p className="text-xl font-mono font-bold mt-4">{colorCode}</p>
          </div>

          <p className="text-gray-600">
            この色を画面に表示して、相手を探してください
          </p>
        </div>

        <button
          onClick={() => {
            // 画面を振動させる（対応デバイスのみ）
            if (navigator.vibrate) {
              navigator.vibrate([200, 100, 200]);
            }
          }}
          className="mt-8 w-full bg-black text-white py-4 rounded-full font-bold"
        >
          画面を点滅させる
        </button>
      </div>
    </div>
  );
}
```

---

## 📱 PWA設定（next.config.js）

```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withPWA({
  reactStrictMode: true,
});
```

### manifest.json（public/manifest.json）

```json
{
  "name": "トレマチ - ライブグッズ交換",
  "short_name": "トレマチ",
  "description": "ライブ会場でグッズ交換相手を見つけるアプリ",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#FF6B35",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## 🚀 開発の進め方（1週間計画）

### Day 1-2: セットアップ
- [ ] Next.js プロジェクト作成
- [ ] Supabase プロジェクト作成
- [ ] データベーススキーマ作成
- [ ] 基本的なページ構造

### Day 3-4: コア機能実装
- [ ] グッズ登録画面
- [ ] 位置情報取得
- [ ] マッチングロジック

### Day 5-6: UI/UX改善
- [ ] 識別マーク画面
- [ ] マッチング結果表示
- [ ] PWA設定

### Day 7: テスト
- [ ] 実機テスト（2台のスマホで）
- [ ] バグ修正
- [ ] Vercelにデプロイ

---

## 🧪 テスト方法

### ローカルテスト
1. 2台のスマホ（または1台のスマホ＋PC）を用意
2. 両方で同じローカルURL（例: `http://192.168.1.5:3000`）にアクセス
3. それぞれ異なるニックネームで登録
4. グッズを登録（相互マッチングするように）
5. 近づいてマッチング開始

### 位置情報のモック（開発時）
Chrome DevToolsの「Sensors」タブで位置情報を偽装可能

---

## 📝 次のステップ

MVPが完成したら:
1. ✅ 実際のライブイベントでテスト
2. ✅ ユーザーフィードバック収集
3. ✅ 必要な機能を追加（認証、評価など）
4. ✅ React Nativeへの移行検討

---

## 💡 開発のコツ

- **まずは動くものを**: 完璧を目指さず、とにかく動くプロトタイプを
- **実際の距離でテスト**: オフィスや公園で試す
- **エラーハンドリング**: 位置情報が取れない場合の対応
- **バッテリー消費**: 位置情報の更新頻度に注意

---

## 🔗 参考リンク

- [Geolocation API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [Supabase Documentation](https://supabase.com/docs)
- [PostGIS Functions](https://postgis.net/docs/reference.html)
- [Next.js PWA](https://github.com/shadowwalker/next-pwa)

---

準備ができたら、実際のコードを一緒に書いていきましょう！
