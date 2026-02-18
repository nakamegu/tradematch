'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')

  // ログインページはレイアウトの認証チェックをスキップ
  const isLoginPage = pathname === '/admin/login'

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false)
      setAuthorized(true)
      return
    }

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/admin/login')
        return
      }

      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      if (adminEmail && session.user.email !== adminEmail) {
        await supabase.auth.signOut()
        router.push('/admin/login')
        return
      }

      setUserEmail(session.user.email || '')
      setAuthorized(true)
      setLoading(false)
    }

    checkAuth()
  }, [isLoginPage, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  if (isLoginPage) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a2d4a] flex items-center justify-center">
        <p className="text-slate-400">読み込み中...</p>
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#1a2d4a]">
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="/admin" className="text-lg font-bold text-indigo-400">
              トレマチ管理
            </a>
            <nav className="flex gap-4">
              <a
                href="/admin/events"
                className={`text-sm ${pathname === '/admin/events' ? 'text-indigo-400 font-medium' : 'text-slate-400 hover:text-slate-200'}`}
              >
                イベント管理
              </a>
              <a
                href="/admin/goods"
                className={`text-sm ${pathname === '/admin/goods' ? 'text-indigo-400 font-medium' : 'text-slate-400 hover:text-slate-200'}`}
              >
                グッズ管理
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{userEmail}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-400 hover:text-red-300"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
