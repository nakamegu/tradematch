# トレマチ MVP スターターキット

このプロジェクトは、**1週間で動くプロトタイプ**を作成するためのスターターコードです。

## 🚀 クイックスタート

### 1. プロジェクトのセットアップ

```bash
# 依存パッケージをインストール
npm install

# 開発サーバーを起動
npm run dev
```

ブラウザで `http://localhost:3000` を開く

### 2. Supabase のセットアップ

1. [Supabase](https://supabase.com) でアカウント作成
2. 新しいプロジェクトを作成
3. SQL エディタで以下を実行:

```sql
-- PostGIS拡張を有効化
CREATE EXTENSION IF NOT EXISTS postgis;

-- usersテーブル
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname VARCHAR(50) NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX users_location_idx ON users USING GIST (location);

-- goodsテーブル
CREATE TABLE goods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(10) CHECK (type IN ('have', 'want')),
  item_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX goods_user_id_idx ON goods(user_id);
CREATE INDEX goods_type_idx ON goods(type);

-- matchesテーブル
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID REFERENCES users(id),
  user2_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending',
  color_code VARCHAR(7),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 近くのユーザーを検索する関数
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

4. `.env.local` ファイルを作成:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 環境変数の設定

Supabase のプロジェクト設定から以下を取得:
- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- API Keys (anon/public) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 📁 プロジェクト構造

```
tradematch-starter/
├── app/                    # Next.js App Router
│   ├── page.tsx           # トップページ
│   ├── register/          # グッズ登録
│   ├── matching/          # マッチング検索
│   └── identify/          # 識別マーク表示
├── components/            # Reactコンポーネント
│   ├── ColorCode.tsx      # カラーコード表示
│   ├── GoodsSelector.tsx  # グッズ選択
│   └── MatchCard.tsx      # マッチング結果カード
├── lib/                   # ユーティリティ
│   ├── supabase.ts        # Supabaseクライアント
│   ├── geolocation.ts     # 位置情報取得
│   └── matching.ts        # マッチングロジック
└── store/                 # 状態管理
    └── userStore.ts       # ユーザー情報ストア
```

## 🛠️ 実装済みの機能

### ✅ 位置情報取得（lib/geolocation.ts）
- `getCurrentLocation()` - 現在地を取得
- `watchLocation()` - 位置の変化を監視
- `calculateDistance()` - 2点間の距離を計算

### ✅ マッチングロジック（lib/matching.ts）
- `checkMatch()` - 2人のグッズを比較
- `findMatches()` - 近くのユーザーとマッチング
- `generateColorCode()` - 識別色を生成

### ✅ カラーコード表示（components/ColorCode.tsx）
- 全画面カラー表示
- 画面点滅機能
- 振動フィードバック（対応デバイス）

## 📱 テスト方法

### ローカルネットワークでテスト

1. PCのローカルIPを確認:
```bash
# Mac/Linux
ifconfig | grep "inet "

# Windows
ipconfig
```

2. 2台のスマホで同じネットワークに接続

3. 両方のスマホで `http://[あなたのIP]:3000` にアクセス

4. それぞれ異なるニックネームで登録

5. グッズを登録（相互マッチングするように）

6. 「マッチング開始」をタップ

### Chrome DevToolsで位置情報をモック

1. DevToolsを開く（F12）
2. ⋮ メニュー → More tools → Sensors
3. Location で任意の座標を設定
4. 複数のブラウザウィンドウで異なる座標を設定してテスト

## 🎨 カスタマイズ

### グッズリストの変更

`lib/goods-data.ts` で定義:

```typescript
export const GOODS_LIST = [
  'キーホルダーA',
  'キーホルダーB',
  'ステッカーA',
  // ...
];
```

### マッチング距離の変更

`lib/matching.ts` の `findMatches()`:

```typescript
export function findMatches(
  currentUser: User,
  nearbyUsers: User[],
  maxDistance: number = 200 // ← ここを変更（メートル単位）
)
```

### カラーパレットの変更

`lib/matching.ts` の `generateColorCode()`:

```typescript
const colors = [
  '#FF6B6B', // 赤
  '#4ECDC4', // 青緑
  // 好きな色を追加
];
```

## 🚀 デプロイ

### Vercel へデプロイ

1. GitHubにプッシュ
2. [Vercel](https://vercel.com) でインポート
3. 環境変数を設定
4. デプロイ完了！

環境変数:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### PWA として動作させる

デプロイ後、スマホのブラウザで開いて「ホーム画面に追加」すると、アプリのように使えます。

## 📝 次に実装すること

### Phase 2: 拡張機能
- [ ] ユーザー認証（Firebase Auth）
- [ ] プッシュ通知
- [ ] チャット機能
- [ ] 交換履歴の保存

### Phase 3: UI/UX改善
- [ ] アニメーション追加
- [ ] ローディング状態の改善
- [ ] エラーメッセージの充実
- [ ] オンボーディングチュートリアル

### Phase 4: 本番移行
- [ ] React Native への移行
- [ ] App Store / Google Play 申請
- [ ] アナリティクス導入
- [ ] A/Bテスト

## 🐛 トラブルシューティング

### 位置情報が取得できない

- HTTPSまたはlocalhostでアクセスしているか確認
- ブラウザの位置情報許可を確認
- Chrome DevToolsのSensorsタブで手動設定

### Supabaseに接続できない

- `.env.local` のURLとキーが正しいか確認
- Supabaseのプロジェクトが起動しているか確認
- ブラウザのコンソールでエラーを確認

### マッチングしない

- 両方のユーザーが相互にマッチする条件か確認
- 距離が200m以内か確認
- `is_active` フラグがtrueか確認

## 💡 ヒント

- まず動くものを作る！完璧を目指さない
- 実際の距離でテストする（オフィスや公園で）
- バッテリー消費に注意（位置情報の更新頻度）
- エラーハンドリングは後回しでOK

## 🔗 参考リンク

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [PWA Documentation](https://web.dev/progressive-web-apps/)

---

質問があれば、いつでもClaudeに聞いてください！
Good luck! 🚀
