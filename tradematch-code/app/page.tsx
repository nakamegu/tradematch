'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [nickname, setNickname] = useState('');
  const router = useRouter();

  const handleStart = () => {
    if (nickname.trim()) {
      // ニックネームをローカルストレージに保存
      localStorage.setItem('nickname', nickname);
      router.push('/register');
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎵</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">トレマチ</h1>
          <p className="text-gray-600">ライブグッズ交換アプリ</p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
              ニックネームを入力
            </label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleStart()}
              placeholder="例: あやか"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none text-lg"
              maxLength={20}
            />
          </div>

          <button
            onClick={handleStart}
            disabled={!nickname.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            はじめる →
          </button>
        </div>

        <div className="mt-8 bg-blue-50 rounded-xl p-4">
          <p className="text-sm text-gray-700 text-center">
            💡 ライブ会場で近くの人とグッズ交換できます
          </p>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>位置情報の利用許可が必要です</p>
        </div>
      </div>
    </main>
  );
}
