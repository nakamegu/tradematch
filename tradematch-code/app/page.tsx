'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ensureAuth } from '@/lib/auth';

export default function Home() {
  const [nickname, setNickname] = useState('');
  const router = useRouter();

  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    if (nickname.trim()) {
      setStarting(true);
      try {
        await ensureAuth();
        localStorage.setItem('nickname', nickname);
        router.push('/select-event');
      } catch (err) {
        console.error('Auth error:', err);
        setStarting(false);
      }
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#1a2d4a] p-4">
      <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">交換っこ</h1>
          <p className="text-slate-400">ライブグッズ交換アプリ</p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-slate-600 mb-2">
              ニックネームを入力
            </label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleStart()}
              placeholder="例: あやか"
              className="w-full px-4 py-3 bg-slate-100 border border-slate-300 text-slate-800 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-lg placeholder-slate-400"
              maxLength={20}
            />
          </div>

          <button
            onClick={handleStart}
            disabled={!nickname.trim() || starting}
            className="w-full bg-indigo-500 hover:bg-indigo-400 text-white py-4 rounded-xl font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            はじめる
          </button>
        </div>

        <div className="mt-8 bg-slate-100 rounded-xl p-4">
          <p className="text-sm text-slate-400 text-center">
            ライブ会場で近くの人とグッズ交換できます
          </p>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          <p>位置情報の利用許可が必要です</p>
        </div>
      </div>
    </main>
  );
}
