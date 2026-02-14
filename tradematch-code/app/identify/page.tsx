'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function IdentifyPage() {
  const [matchData, setMatchData] = useState<any>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // ローカルストレージからマッチング情報を取得
    const data = localStorage.getItem('currentMatch');
    if (data) {
      setMatchData(JSON.parse(data));
    } else {
      // データがない場合はマッチングページに戻る
      router.push('/matching');
    }
  }, [router]);

  const handleFlash = () => {
    setIsFlashing(true);
    
    // 振動（対応デバイスのみ）
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    setTimeout(() => setIsFlashing(false), 1500);
  };

  const handleComplete = () => {
    // 交換完了処理（デモ版）
    alert('交換完了！お疲れ様でした 🎉');
    // データをクリア
    localStorage.removeItem('currentMatch');
    router.push('/');
  };

  if (!matchData) {
    return null;
  }

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-6 transition-all duration-300 ${
        isFlashing ? 'animate-pulse' : ''
      }`}
      style={{ backgroundColor: matchData.colorCode }}
    >
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl text-center max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          交換相手を見つけてください
        </h1>

        {/* 相手の情報 */}
        <div className="my-6">
          <div className="text-7xl mb-3">👋</div>
          <p className="text-2xl font-bold text-gray-800">{matchData.nickname}</p>
          <p className="text-gray-600 mt-1">約 {matchData.distance}m</p>
        </div>

        {/* カラーコード */}
        <div className="bg-gray-50 rounded-2xl p-6 mb-6">
          <p className="text-sm text-gray-600 mb-3 font-medium">識別カラー</p>
          <div
            className="w-40 h-40 mx-auto rounded-2xl shadow-xl transform hover:scale-105 transition-transform"
            style={{ backgroundColor: matchData.colorCode }}
          />
          <p className="text-xl font-mono font-bold mt-4 text-gray-800">
            {matchData.colorCode}
          </p>
        </div>

        {/* 説明 */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-700 leading-relaxed">
            💡 この色を画面に表示して、会場で相手を探してください。
            同じ色の画面を持っている人があなたの交換相手です！
          </p>
        </div>

        {/* アクションボタン */}
        <button
          onClick={handleFlash}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all mb-3"
        >
          ✨ 画面を点滅させる
        </button>

        <button
          onClick={handleComplete}
          className="w-full bg-green-500 text-white py-3 rounded-full font-semibold hover:bg-green-600 transition-colors mb-3"
        >
          ✓ 交換完了
        </button>

        <button
          onClick={() => router.push('/matching')}
          className="w-full bg-gray-200 text-gray-700 py-3 rounded-full font-semibold hover:bg-gray-300 transition-colors"
        >
          ← 戻る
        </button>
      </div>

      {/* 使い方のヒント */}
      <div className="mt-8 max-w-md">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4">
          <h3 className="font-bold text-gray-800 mb-2">🔍 相手の見つけ方</h3>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>画面を目立つように掲げる</li>
            <li>同じ色の画面を探す</li>
            <li>お互いに確認したら交換開始！</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
