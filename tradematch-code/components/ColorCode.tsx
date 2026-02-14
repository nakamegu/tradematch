// components/ColorCode.tsx
'use client';

import { useEffect, useState } from 'react';

interface ColorCodeProps {
  colorCode: string;
  nickname: string;
  onBack?: () => void;
}

export default function ColorCode({ colorCode, nickname, onBack }: ColorCodeProps) {
  const [isFlashing, setIsFlashing] = useState(false);

  const handleFlash = () => {
    setIsFlashing(true);
    
    // 振動（対応デバイスのみ）
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    setTimeout(() => setIsFlashing(false), 1500);
  };

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-6 transition-all duration-300 ${
        isFlashing ? 'animate-pulse' : ''
      }`}
      style={{ backgroundColor: colorCode }}
    >
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl text-center max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          交換相手を見つけてください
        </h1>

        {/* アバター */}
        <div className="my-6">
          <div className="text-7xl mb-3">👋</div>
          <p className="text-2xl font-bold text-gray-800">{nickname}</p>
        </div>

        {/* カラーコード */}
        <div className="bg-gray-50 rounded-2xl p-6 mb-6">
          <p className="text-sm text-gray-600 mb-3 font-medium">識別カラー</p>
          <div
            className="w-40 h-40 mx-auto rounded-2xl shadow-xl transform hover:scale-105 transition-transform"
            style={{ backgroundColor: colorCode }}
          />
          <p className="text-xl font-mono font-bold mt-4 text-gray-800">
            {colorCode}
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

        {onBack && (
          <button
            onClick={onBack}
            className="w-full bg-gray-200 text-gray-700 py-3 rounded-full font-semibold hover:bg-gray-300 transition-colors"
          >
            ← 戻る
          </button>
        )}
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
