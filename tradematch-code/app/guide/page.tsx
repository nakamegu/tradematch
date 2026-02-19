'use client'

import Logo from '@/components/Logo'

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[220px] rounded-[28px] border-4 border-slate-700 bg-[#1a2d4a] p-2 shadow-xl shrink-0">
      <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-slate-600" />
      <div className="rounded-[20px] overflow-hidden bg-[#1a2d4a]">
        {children}
      </div>
      <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-slate-600" />
    </div>
  )
}

function MockGoodsItem({ name, selected, color }: { name: string; selected?: boolean; color?: string }) {
  return (
    <div className={`rounded-lg p-1 text-center border-2 ${
      selected ? `${color || 'bg-blue-500/20'} ${color === 'bg-pink-500/20' ? 'border-pink-400' : 'border-indigo-500'}` : 'bg-slate-100 border-slate-300'
    }`}>
      <div className={`w-full aspect-square rounded mb-0.5 ${selected ? 'bg-white/40' : 'bg-slate-200'}`} />
      <p className="text-[6px] text-slate-700 leading-tight truncate">{name}</p>
      {selected && color !== 'bg-pink-500/20' && (
        <div className="flex items-center justify-center gap-0.5 mt-0.5">
          <span className="w-3 h-3 rounded-full bg-indigo-500 text-white text-[5px] flex items-center justify-center font-bold">-</span>
          <span className="text-[6px] font-bold text-slate-700">1</span>
          <span className="w-3 h-3 rounded-full bg-indigo-500 text-white text-[5px] flex items-center justify-center font-bold">+</span>
        </div>
      )}
    </div>
  )
}

/** STEP1: register画面 */
function MockRegisterScreen() {
  return (
    <div className="p-2 space-y-1.5">
      <div className="bg-slate-50 rounded-lg p-1.5">
        <p className="text-[8px] font-bold text-slate-700">東京ドーム公演 2026</p>
        <p className="text-[6px] text-slate-400">交換したいグッズを登録しましょう</p>
      </div>
      {/* 譲 */}
      <div className="bg-slate-50 rounded-lg p-1.5">
        <div className="flex items-center gap-1 mb-1">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-[7px] font-bold">譲</span>
          <span className="text-[6px] text-slate-400">2種類 / 合計2個</span>
        </div>
        <p className="text-[6px] text-slate-500 mb-0.5">缶バッジ</p>
        <div className="grid grid-cols-3 gap-0.5">
          <MockGoodsItem name="バッジ A" selected />
          <MockGoodsItem name="バッジ B" />
          <MockGoodsItem name="バッジ C" selected />
        </div>
      </div>
      {/* 求 */}
      <div className="bg-slate-50 rounded-lg p-1.5">
        <div className="flex items-center gap-1 mb-1">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-pink-500 text-white text-[7px] font-bold">求</span>
          <span className="text-[6px] text-slate-400">2種類から</span>
        </div>
        <p className="text-[6px] text-slate-500 mb-0.5">缶バッジ</p>
        <div className="grid grid-cols-3 gap-0.5">
          <MockGoodsItem name="バッジ A" />
          <MockGoodsItem name="バッジ B" selected color="bg-pink-500/20" />
          <MockGoodsItem name="バッジ C" />
        </div>
        <p className="text-[6px] text-slate-500 mb-0.5 mt-1">アクスタ</p>
        <div className="grid grid-cols-3 gap-0.5">
          <MockGoodsItem name="アクスタ A" selected color="bg-pink-500/20" />
          <MockGoodsItem name="アクスタ B" />
          <MockGoodsItem name="アクスタ C" />
        </div>
      </div>
      <div className="bg-indigo-500 text-white text-[8px] font-bold text-center py-1.5 rounded-lg">
        マッチング開始
      </div>
    </div>
  )
}

/** STEP2: matching結果画面 */
function MockMatchingScreen() {
  return (
    <div className="p-2 space-y-1.5">
      <div className="bg-slate-50 rounded-lg p-1.5">
        <p className="text-[9px] font-bold text-slate-700">マッチング結果</p>
        <p className="text-[6px] text-slate-400">1人の交換相手が見つかりました！</p>
      </div>
      <div className="bg-slate-50 rounded-lg p-1.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center">
              <span className="text-[6px] text-slate-400">👤</span>
            </div>
            <div>
              <p className="text-[8px] font-bold text-slate-700">ゆうきさん</p>
              <p className="text-[6px] text-slate-400">約 120m</p>
            </div>
          </div>
          <div className="w-5 h-5 rounded-full shadow" style={{ backgroundColor: '#FF6B6B' }} />
        </div>
        <div className="bg-slate-100 rounded-md p-1.5 mb-1.5">
          <div className="mb-1">
            <span className="text-[5px] font-bold text-slate-500 bg-slate-200 px-1 py-0.5 rounded">1:1 交換</span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <div className="bg-slate-50 rounded p-1">
              <p className="text-[5px] font-semibold text-indigo-600 mb-0.5">相手が出せる</p>
              <p className="text-[6px] text-slate-700">バッジ B ×1</p>
            </div>
            <div className="bg-slate-50 rounded p-1">
              <p className="text-[5px] font-semibold text-indigo-600 mb-0.5">あなたが出せる</p>
              <p className="text-[6px] text-slate-700">バッジ A ×1</p>
            </div>
          </div>
        </div>
        <div className="bg-indigo-500 text-white text-[7px] font-bold text-center py-1 rounded-md">
          交換リクエスト送信
        </div>
      </div>
    </div>
  )
}

/** STEP2.5: 交換リクエスト通知画面 */
function MockRequestNotification() {
  return (
    <div className="p-2 space-y-1.5">
      {/* リクエスト通知（イベント名より上に表示） */}
      <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-1.5">
        <p className="text-[7px] font-bold text-amber-600 mb-1">🔔 ゆうきさんから交換リクエスト！</p>
        <div className="grid grid-cols-2 gap-1 mb-1.5">
          <div className="bg-white/80 rounded p-1">
            <p className="text-[5px] font-semibold text-indigo-600 mb-0.5">もらえるグッズ</p>
            <p className="text-[6px] text-slate-700">✓ バッジ B</p>
          </div>
          <div className="bg-white/80 rounded p-1">
            <p className="text-[5px] font-semibold text-indigo-600 mb-0.5">渡すグッズ</p>
            <p className="text-[6px] text-slate-700">✓ バッジ A</p>
          </div>
        </div>
        <div className="flex gap-1">
          <div className="flex-1 bg-indigo-500 text-white text-[6px] font-bold text-center py-1 rounded-md">
            承認して識別へ
          </div>
          <div className="px-2 bg-slate-100 text-slate-500 text-[6px] font-semibold text-center py-1 rounded-md">
            後で
          </div>
        </div>
      </div>
      {/* ヘッダー */}
      <div className="bg-slate-50 rounded-lg p-1.5 opacity-40">
        <p className="text-[8px] font-bold text-slate-700">東京ドーム公演 2026</p>
        <p className="text-[6px] text-slate-400">交換したいグッズを登録しましょう</p>
      </div>
      {/* 背景のグッズ（薄く表示） */}
      <div className="bg-slate-50 rounded-lg p-1.5 opacity-40">
        <div className="flex items-center gap-1 mb-1">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-[7px] font-bold">譲</span>
          <span className="text-[6px] text-slate-400">2種類</span>
        </div>
        <div className="grid grid-cols-3 gap-0.5">
          <MockGoodsItem name="バッジ A" selected />
          <MockGoodsItem name="バッジ B" />
          <MockGoodsItem name="バッジ C" selected />
        </div>
      </div>
    </div>
  )
}

/** STEP3: identify画面 */
function MockIdentifyScreen() {
  return (
    <div className="p-2" style={{ backgroundColor: '#FF6B6B' }}>
      <div className="bg-slate-50/95 rounded-xl p-2 space-y-1.5 text-center">
        <p className="text-[8px] font-bold text-slate-800">交換相手を見つけてください</p>
        <span className="inline-block px-2 py-0.5 rounded-full text-[6px] font-bold bg-blue-500/20 text-blue-600">
          相手が承認しました！
        </span>
        <div>
          <div className="w-5 h-5 rounded-full bg-slate-200 mx-auto mb-0.5 flex items-center justify-center">
            <span className="text-[6px] text-slate-400">👤</span>
          </div>
          <p className="text-[8px] font-bold text-slate-700">ゆうきさん</p>
          <p className="text-[5px] text-slate-400">約 50m</p>
        </div>
        <div className="bg-slate-100 rounded-lg p-1.5">
          <p className="text-[5px] text-slate-400 mb-0.5">識別カラー</p>
          <div className="w-12 h-12 mx-auto rounded-lg shadow" style={{ backgroundColor: '#FF6B6B' }} />
        </div>
        <div className="rounded-md bg-emerald-100 h-12 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-1 left-3 w-12 h-6 rounded bg-emerald-300" />
            <div className="absolute bottom-1 right-2 w-10 h-5 rounded bg-emerald-300" />
          </div>
          <div className="w-2 h-2 bg-indigo-500 rounded-full border border-white shadow z-10" />
          <div className="w-2 h-2 bg-red-500 rounded-full border border-white shadow z-10 ml-4" />
        </div>
        <div className="bg-slate-100 rounded-md py-1 text-[6px] text-slate-600 font-semibold flex items-center justify-center gap-0.5">
          💬 メッセージ
        </div>
        <div className="grid grid-cols-2 gap-1">
          <div className="bg-emerald-500 text-white text-[6px] font-bold py-1 rounded-md text-center">交換完了</div>
          <div className="bg-slate-200 text-slate-500 text-[6px] font-bold py-1 rounded-md text-center">キャンセル</div>
        </div>
      </div>
    </div>
  )
}

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-[#1a2d4a] p-4">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 p-6 mb-6 text-center">
          <Logo size="lg" />
          <p className="text-slate-500 text-sm mt-3 leading-relaxed">
            ライブ会場でグッズを物々交換するためのアプリです。<br />
            お互いの条件が合う相手を自動で見つけて、その場で手渡し交換します。
          </p>
        </div>

        {/* STEP 1 */}
        <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="shrink-0 w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <div>
              <h2 className="text-base font-bold text-slate-800">グッズを登録する</h2>
              <p className="text-xs text-slate-500">持っているグッズと欲しいグッズを選択</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <PhoneFrame><MockRegisterScreen /></PhoneFrame>
            <div className="flex-1 space-y-2">
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong className="text-blue-500">譲りたいグッズ</strong>と<strong className="text-pink-500">欲しいグッズ</strong>をタップして選びます。
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                数量も調整できるので、同じグッズを複数持っている場合も対応できます。欲しいグッズは複数選んでOKです。
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                選んだら「マッチング開始」をタップして、会場にいる相手を探しましょう。
              </p>
            </div>
          </div>
        </div>

        {/* STEP 2 */}
        <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="shrink-0 w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <div>
              <h2 className="text-base font-bold text-slate-800">自動でマッチング</h2>
              <p className="text-xs text-slate-500">条件の合う近くの相手が見つかると通知</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <PhoneFrame><MockMatchingScreen /></PhoneFrame>
            <div className="flex-1 space-y-2">
              <p className="text-sm text-slate-700 leading-relaxed">
                会場エリア内にいる人の中から、交換条件が合う相手を自動で探します。
              </p>
              <div className="bg-indigo-50 rounded-lg p-3 text-sm text-slate-700">
                <p className="font-semibold text-indigo-600 mb-1">マッチの条件</p>
                <p className="leading-relaxed">
                  あなたの「譲」の中に相手が欲しいものが<strong>1つ以上</strong>あり、かつ相手の「譲」の中にあなたが欲しいものが<strong>1つ以上</strong>あればマッチします。全部が一致する必要はありません。
                </p>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                マッチが見つかると<strong>音と振動で通知</strong>。交換内容と距離を確認してリクエストを送れます。
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                相手がいない場合もページを開いたまま待てば、新しい人が来たときに自動で再検索されます。
              </p>
            </div>
          </div>
        </div>

        {/* STEP 2.5: 交換リクエスト通知 */}
        <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="shrink-0 w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold">!</span>
            <div>
              <h2 className="text-base font-bold text-slate-800">交換リクエストが届く</h2>
              <p className="text-xs text-slate-500">相手からのリクエストは音と振動でお知らせ</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <PhoneFrame><MockRequestNotification /></PhoneFrame>
            <div className="flex-1 space-y-2">
              <p className="text-sm text-slate-700 leading-relaxed">
                相手がリクエストを送ると、あなたの画面に通知が表示されます。<strong>音と振動</strong>でも知らせるので、画面を見ていなくても気づけます。
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                もらえるグッズと渡すグッズの内容を確認して、「承認して識別へ」をタップすると交換に進みます。
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                この通知はグッズ登録画面・マッチング画面のどちらにいても届きます。
              </p>
            </div>
          </div>
        </div>

        {/* STEP 3 */}
        <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="shrink-0 w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <div>
              <h2 className="text-base font-bold text-slate-800">識別カラーで合流して交換</h2>
              <p className="text-xs text-slate-500">画面の色を目印に相手を探して手渡し</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <PhoneFrame><MockIdentifyScreen /></PhoneFrame>
            <div className="flex-1 space-y-2">
              <p className="text-sm text-slate-700 leading-relaxed">
                リクエストが承認されると、お互いの画面が同じ<strong>識別カラー</strong>で表示されます。この色のスマホ画面を見せ合って相手を見つけてください。
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                地図でお互いの位置をリアルタイムに確認でき、チャットで連絡も取れます。
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                合流できたらグッズを手渡しで交換して「交換完了」を押せば終わりです。
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 p-6 mb-4">
          <h2 className="text-base font-bold text-slate-800 mb-3">よくある質問</h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold text-slate-700">会員登録は必要？</p>
              <p className="text-slate-500">いいえ。ニックネームを入力するだけで始められます。メールアドレスやパスワードは不要です。</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700">位置情報は必要？</p>
              <p className="text-slate-500">マッチングと合流時に必要です。会場エリア内でのみ動作し、バックグラウンドでの取得は行いません。</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700">お金のやり取りはある？</p>
              <p className="text-slate-500">ありません。グッズ同士の物々交換専用です。</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700">登録したグッズが全部一致しないとマッチしない？</p>
              <p className="text-slate-500">いいえ。お互いの譲りたいグッズと欲しいグッズが1つでも重なればマッチします。全部一致する必要はありません。</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700">「登録可能期間」と「交換可能期間」って？</p>
              <p className="text-slate-500">イベントごとに管理者が設定する期間です。「登録可能期間」内でのみグッズの登録ができ、「交換可能期間」内でのみマッチング・交換ができます。期間が設定されていないイベントはいつでも利用できます。</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700">会場エリアって何？</p>
              <p className="text-slate-500">イベントごとに設定された地理的なエリアです。マッチングはこのエリア内にいる人同士でのみ行われます。会場の近くにいないとマッチングを開始できません。</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700">期間外でも何かできる？</p>
              <p className="text-slate-500">登録可能期間の前でもイベントページにアクセスしてグッズの一覧を確認できます。期間が始まったらすぐに登録を始められます。</p>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <a href="/" className="bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors">
            はじめる
          </a>
          <a href="/privacy" className="text-slate-400 text-sm hover:text-slate-300 flex items-center">
            データの取り扱い
          </a>
        </div>
      </div>
    </main>
  )
}
