'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ensureAuth } from '@/lib/auth';
import Logo from '@/components/Logo';

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
        <div className="text-center mb-6">
          <h1 className="mb-2"><Logo size="lg" /></h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            ライブ会場でグッズを物々交換するためのアプリです。<br />
            会場にいる人同士で、その場で手渡し交換します。
          </p>
        </div>

        {/* チュートリアル */}
        <div className="mb-6 space-y-3">
          <h2 className="text-sm font-bold text-slate-700">使い方</h2>
          <div className="space-y-2">
            <div className="flex gap-3 items-start">
              <span className="shrink-0 w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <p className="text-sm text-slate-600">ニックネームを入力してイベントを選びます</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="shrink-0 w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <p className="text-sm text-slate-600"><strong>持っているグッズ</strong>と<strong>欲しいグッズ</strong>を登録します</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="shrink-0 w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <p className="text-sm text-slate-600">お互いの条件が合う相手が自動で見つかります</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="shrink-0 w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <p className="text-sm text-slate-600">画面に表示される<strong>識別カラー</strong>を目印に会場で相手を探して、手渡しで交換します</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-100 rounded-xl p-3 mb-6">
          <p className="text-xs text-slate-500 text-center leading-relaxed">
            会場エリア内でのみ利用できます。位置情報の許可が必要です。<br />
            金銭のやり取りはありません。グッズ同士の交換専用です。
          </p>
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
      </div>
    </main>
  );
}
