# トレマチ MVP - 完全動作版

ライブグッズ交換マッチングアプリのプロトタイプです。
**このプロジェクトは `npm install` → `npm run dev` ですぐに動きます！**

## 🎯 このプロジェクトでできること

✅ ニックネームでログイン（認証不要）
✅ グッズ登録（持っている・欲しい）
✅ マッチング検索（デモデータ）
✅ 識別マーク表示（カラーコード）
✅ 位置情報の取得

## 🚀 すぐに始める（5分）

### 1. プロジェクトのセットアップ

```bash
# このディレクトリで実行
npm install

# 開発サーバーを起動
npm run dev
```

ブラウザで `http://localhost:3000` を開く

### 2. スマホでテスト

PCと同じWi-Fiに接続したスマホで:

```
http://[あなたのPCのIP]:3000
```

例: `http://192.168.1.100:3000`

PCのIPアドレス確認:
- Mac/Linux: `ifconfig | grep "inet "`
- Windows: `ipconfig`

## 📱 使い方

1. **ニックネームを入力** → 「はじめる」
2. **グッズ登録** → 持っているグッズと欲しいグッズを選択
3. **マッチング検索** → 近くの交換相手を探す（デモでは2人表示）
4. **識別マーク** → カラーコードで相手を見つける
5. **交換完了** → 交換が終わったら完了ボタン

## 🛠️ 現在の状態

### ✅ 実装済み
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS でのスタイリング
- ローカルストレージでのデータ保存
- レスポンシブデザイン（スマホ対応）
- 位置情報取得の許可フロー
- 識別マーク表示（カラーコード + 点滅機能）

### 🔨 まだデモデータ
- マッチング結果（ハードコードされた2人）
- 距離計算（実際の位置情報は未使用）

### ⚙️ 次に実装すること
1. **Supabase連携** - 本物のデータベース接続
2. **位置情報ベースマッチング** - 実際の距離計算
3. **リアルタイム更新** - 近くの人が変わったら通知

## 📂 プロジェクト構造

```
tradematch-mvp/
├── app/                      # Next.js App Router
│   ├── page.tsx             # トップページ（ニックネーム入力）
│   ├── register/page.tsx    # グッズ登録
│   ├── matching/page.tsx    # マッチング検索
│   ├── identify/page.tsx    # 識別マーク表示
│   ├── layout.tsx           # ルートレイアウト
│   └── globals.css          # グローバルCSS
├── components/              # Reactコンポーネント（今後追加）
├── lib/                     # ユーティリティ（今後追加）
├── public/                  # 静的ファイル
├── package.json             # 依存関係
├── tsconfig.json            # TypeScript設定
├── tailwind.config.js       # Tailwind設定
└── next.config.js           # Next.js設定
```

## 🔧 Supabaseとの連携（次のステップ）

### 1. Supabase プロジェクト作成

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
  created_at TIMESTAMP DEFAULT NOW()
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
```

### 2. 環境変数の設定

`.env.local` ファイルを作成:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Supabaseのプロジェクト設定 → API から取得できます。

### 3. Supabaseクライアントの作成

`lib/supabase.ts` を作成（後で一緒に実装しましょう）

## 🌐 デプロイ

### Vercel へデプロイ（無料）

1. GitHubにプッシュ
2. [Vercel](https://vercel.com) でインポート
3. 環境変数を設定
4. デプロイ完了！

デプロイ後、スマホで「ホーム画面に追加」すればアプリのように使えます。

## 🎨 カスタマイズ

### グッズリストの変更

`app/register/page.tsx` の `SAMPLE_GOODS` 配列を編集:

```typescript
const SAMPLE_GOODS = [
  'あなたのグッズ1',
  'あなたのグッズ2',
  // ...
];
```

### カラーパレットの変更

`app/matching/page.tsx` の `DEMO_MATCHES` で色を変更:

```typescript
colorCode: '#YOUR_COLOR'
```

### デザインの調整

Tailwind CSS のクラスを変更するだけ！

## 🐛 トラブルシューティング

### 位置情報が取得できない

- `http://localhost:3000` または `https://` でアクセス（`http://192.168...` では動作しません）
- ブラウザの位置情報許可を確認
- Chrome の場合: 設定 → プライバシーとセキュリティ → サイトの設定 → 位置情報

### npm install でエラー

- Node.js 18以上がインストールされているか確認: `node -v`
- `npm cache clean --force` を実行してから再度 `npm install`

### 画面が真っ白

- ブラウザのコンソール（F12）でエラーを確認
- `npm run dev` のターミナル出力を確認

## 💡 開発のヒント

- **まず動くものを確認**: デモモードで全体のフローを体験
- **段階的に実装**: Supabase連携は後からでOK
- **スマホで実機テスト**: 位置情報は実機じゃないと動きません
- **2台のデバイスでテスト**: マッチングの様子を確認

## 📝 次の実装ステップ

### Phase 1: Supabase連携（1-2日）
- [ ] Supabaseクライアント作成
- [ ] ユーザー作成API
- [ ] グッズ登録API
- [ ] 近くのユーザー検索API

### Phase 2: リアルタイムマッチング（2-3日）
- [ ] 位置情報の定期更新
- [ ] マッチングロジック実装
- [ ] Supabase Realtimeで通知

### Phase 3: UI/UX改善（1-2日）
- [ ] ローディングアニメーション
- [ ] エラーハンドリング
- [ ] 成功フィードバック

## 🆘 困った時は

Claudeに質問してください！

- コードレビュー
- バグ修正
- 機能追加
- デプロイサポート

すべてお手伝いします 😊

---

**Let's build something awesome! 🚀**
