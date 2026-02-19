'use client'

import Logo from '@/components/Logo'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#1a2d4a] p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <Logo size="sm" />
            <h1 className="text-xl font-bold text-slate-800">データの取り扱いについて</h1>
          </div>

          <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
            <section>
              <h2 className="text-base font-bold text-slate-800 mb-2">このアプリについて</h2>
              <p>
                譲求は、ライブ会場でグッズを手渡し交換するためのマッチングアプリです。
                サービスの提供に必要な最小限のデータのみ保存しており、広告・分析・第三者提供などの目的では一切使用しません。
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-800 mb-2">保存するデータ</h2>

              <h3 className="font-semibold text-slate-700 mt-3 mb-1">サーバー（Supabase）に保存</h3>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li><strong>ニックネーム</strong> — 交換相手に表示する名前（本名は不要）</li>
                <li><strong>位置情報（GPS座標）</strong> — マッチング時に会場エリア内の確認と、相手との距離計算に使用</li>
                <li><strong>グッズ登録情報</strong> — 持っているグッズ・欲しいグッズとその数量</li>
                <li><strong>マッチング履歴</strong> — 誰と交換したかの記録、識別カラー</li>
                <li><strong>チャットメッセージ</strong> — マッチした相手とのメッセージ</li>
                <li><strong>アップロード画像</strong> — グッズ追加リクエスト時にアップロードした画像</li>
              </ul>

              <h3 className="font-semibold text-slate-700 mt-3 mb-1">端末（ブラウザ）に保存</h3>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li><strong>ニックネーム</strong> — 再入力を省くため</li>
                <li><strong>選択中のイベント</strong> — 画面遷移時の引き継ぎ用</li>
                <li><strong>グッズ選択状態</strong> — 入力途中の内容を保持するため</li>
                <li><strong>認証トークン</strong> — Supabaseの匿名認証セッション（自動管理）</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-800 mb-2">アカウントと認証</h2>
              <p>
                メールアドレスやパスワードの登録は不要です。
                初回アクセス時にSupabaseの匿名認証により自動的にIDが発行されます。
                個人を特定できる情報（メール・電話番号・SNSアカウント等）は収集しません。
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-800 mb-2">位置情報について</h2>
              <p>
                位置情報はマッチング画面と識別画面でのみ取得します。
                会場エリア内にいることの確認と、交換相手との距離表示に使用します。
                バックグラウンドでの位置情報取得は行いません。
                ブラウザの位置情報許可を拒否した場合、マッチング機能は利用できませんが、グッズの登録は可能です。
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-800 mb-2">利用している外部サービス</h2>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li><strong>Supabase</strong> — データベース・認証・画像ストレージ・リアルタイム通信</li>
                <li><strong>OpenStreetMap</strong> — 地図表示（タイル画像の配信のみ）</li>
              </ul>
              <p className="mt-1">
                いずれもマッチング機能の提供に必要な範囲でのみ利用しています。
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-800 mb-2">データの削除</h2>
              <p>
                グッズ登録画面の下部にある「データを全て削除して終了」から、
                ニックネーム・グッズ登録・マッチング履歴を含むすべてのデータを削除できます。
                削除後のデータ復元はできません。
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-800 mb-2">データの用途</h2>
              <p>
                保存したデータはグッズ交換のマッチング機能の提供のみに使用します。
                広告表示、行動分析、第三者への提供、マーケティング目的での利用は一切行いません。
              </p>
            </section>
          </div>
        </div>

        <div className="text-center">
          <a href="/" className="text-slate-400 text-sm hover:text-slate-300">
            トップに戻る
          </a>
        </div>
      </div>
    </main>
  )
}
