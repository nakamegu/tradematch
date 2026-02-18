'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
    if (adminEmail && email !== adminEmail) {
      setError('管理者権限がありません')
      setLoading(false)
      return
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('ログインに失敗しました: ' + authError.message)
      setLoading(false)
      return
    }

    router.push('/admin')
  }

  return (
    <div className="min-h-screen bg-[#1a2d4a] flex items-center justify-center p-4">
      <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">管理者ログイン</h1>
        <p className="text-slate-400 text-center text-sm mb-6">トレマチ管理ダッシュボード</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-100 border border-slate-300 text-slate-800 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder-slate-400"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-100 border border-slate-300 text-slate-800 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder-slate-400"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-500 text-white py-3 px-4 rounded-xl hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold"
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-slate-500 hover:text-slate-400">
            トップページに戻る
          </a>
        </div>
      </div>
    </div>
  )
}
