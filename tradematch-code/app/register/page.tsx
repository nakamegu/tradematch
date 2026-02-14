'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// サンプルグッズリスト
const SAMPLE_GOODS = [
  'キーホルダーA', 'キーホルダーB', 'キーホルダーC',
  'ステッカーA', 'ステッカーB', 'ステッカーC',
  'ポストカードA', 'ポストカードB', 'ポストカードC',
  'バッジA', 'バッジB', 'バッジC',
  'タオルA', 'タオルB', 'タオルC',
  'ペンライトA', 'ペンライトB', 'ペンライトC',
  'Tシャツ', 'トートバッグ', 'クリアファイル'
];

export default function RegisterPage() {
  const [haveGoods, setHaveGoods] = useState<string[]>([]);
  const [wantGoods, setWantGoods] = useState<string[]>([]);
  const router = useRouter();

  const toggleHaveGood = (good: string) => {
    if (haveGoods.includes(good)) {
      setHaveGoods(haveGoods.filter(g => g !== good));
    } else {
      setHaveGoods([...haveGoods, good]);
    }
  };

  const toggleWantGood = (good: string) => {
    if (wantGoods.includes(good)) {
      setWantGoods(wantGoods.filter(g => g !== good));
    } else {
      setWantGoods([...wantGoods, good]);
    }
  };

  const handleNext = () => {
    if (haveGoods.length > 0 && wantGoods.length > 0) {
      // データをローカルストレージに保存
      localStorage.setItem('haveGoods', JSON.stringify(haveGoods));
      localStorage.setItem('wantGoods', JSON.stringify(wantGoods));
      router.push('/matching');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-4">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">グッズ登録</h1>
          <p className="text-gray-600">持っているグッズと欲しいグッズを選んでください</p>
        </div>

        {/* 持っているグッズ */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-4">
          <h2 className="text-2xl font-bold text-purple-600 mb-4 flex items-center gap-2">
            ✅ 持っているグッズ
            <span className="text-sm font-normal text-gray-500">({haveGoods.length}個選択中)</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {SAMPLE_GOODS.map((good) => (
              <button
                key={good}
                onClick={() => toggleHaveGood(good)}
                className={`p-3 rounded-xl border-2 transition-all ${
                  haveGoods.includes(good)
                    ? 'bg-purple-100 border-purple-500 text-purple-700'
                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:border-purple-300'
                }`}
              >
                {good}
              </button>
            ))}
          </div>
        </div>

        {/* 欲しいグッズ */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-4">
          <h2 className="text-2xl font-bold text-pink-600 mb-4 flex items-center gap-2">
            ❤️ 欲しいグッズ
            <span className="text-sm font-normal text-gray-500">({wantGoods.length}個選択中)</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {SAMPLE_GOODS.map((good) => (
              <button
                key={good}
                onClick={() => toggleWantGood(good)}
                className={`p-3 rounded-xl border-2 transition-all ${
                  wantGoods.includes(good)
                    ? 'bg-pink-100 border-pink-500 text-pink-700'
                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:border-pink-300'
                }`}
              >
                {good}
              </button>
            ))}
          </div>
        </div>

        {/* 次へボタン */}
        <button
          onClick={handleNext}
          disabled={haveGoods.length === 0 || wantGoods.length === 0}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          マッチング開始 →
        </button>

        {(haveGoods.length === 0 || wantGoods.length === 0) && (
          <p className="text-white text-center mt-4 text-sm">
            ※ 両方のグッズを1つ以上選択してください
          </p>
        )}
      </div>
    </main>
  );
}
