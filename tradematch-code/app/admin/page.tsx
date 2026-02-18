'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Stats = {
  events: number
  goods: number
  activeUsers: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({ events: 0, goods: 0, activeUsers: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const [eventsRes, goodsRes, usersRes] = await Promise.all([
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.from('goods_master').select('id', { count: 'exact', head: true }),
        supabase.from('user_goods').select('user_id', { count: 'exact', head: true }),
      ])

      setStats({
        events: eventsRes.count || 0,
        goods: goodsRes.count || 0,
        activeUsers: usersRes.count || 0,
      })
      setLoading(false)
    }

    fetchStats()
  }, [])

  const cards = [
    { label: 'イベント数', value: stats.events, href: '/admin/events', color: 'bg-indigo-500' },
    { label: 'グッズ数', value: stats.goods, href: '/admin/goods', color: 'bg-indigo-500' },
    { label: 'アクティブユーザー数', value: stats.activeUsers, href: '#', color: 'bg-indigo-500' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-100 mb-6">ダッシュボード</h1>

      {loading ? (
        <p className="text-slate-400">読み込み中...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {cards.map((card) => (
            <a
              key={card.label}
              href={card.href}
              className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 p-6 hover:bg-slate-200 transition-colors"
            >
              <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
                <span className="text-white font-bold text-lg">{card.value}</span>
              </div>
              <p className="text-slate-400 text-sm">{card.label}</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{card.value}</p>
            </a>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <a
          href="/admin/events"
          className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-indigo-500 p-6 hover:bg-slate-200 transition-colors"
        >
          <h2 className="text-lg font-bold text-slate-800 mb-2">イベント管理</h2>
          <p className="text-slate-400 text-sm">イベントの作成・編集・有効/無効の切り替え</p>
        </a>
        <a
          href="/admin/goods"
          className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-indigo-500 p-6 hover:bg-slate-200 transition-colors"
        >
          <h2 className="text-lg font-bold text-slate-800 mb-2">グッズ管理</h2>
          <p className="text-slate-400 text-sm">グッズの作成・編集・一括登録・画像アップロード</p>
        </a>
      </div>
    </div>
  )
}
