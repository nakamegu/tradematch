'use client'

import { useEffect, useState } from 'react'
import { supabase, Event } from '@/lib/supabase'

type EventForm = {
  name: string
  artist_name: string
  event_date: string
  venue: string
  is_active: boolean
}

const emptyForm: EventForm = {
  name: '',
  artist_name: '',
  event_date: '',
  venue: '',
  is_active: true,
}

export default function EventsManagementPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<EventForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: false })

    if (error) {
      setError('イベントの取得に失敗しました')
      return
    }
    setEvents(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    if (editingId) {
      const { error } = await supabase
        .from('events')
        .update(form)
        .eq('id', editingId)

      if (error) {
        setError('更新に失敗しました: ' + error.message)
        setSaving(false)
        return
      }
    } else {
      const { error } = await supabase
        .from('events')
        .insert(form)

      if (error) {
        setError('作成に失敗しました: ' + error.message)
        setSaving(false)
        return
      }
    }

    setForm(emptyForm)
    setEditingId(null)
    setSaving(false)
    fetchEvents()
  }

  const startEdit = (event: Event) => {
    setEditingId(event.id)
    setForm({
      name: event.name,
      artist_name: event.artist_name,
      event_date: event.event_date,
      venue: event.venue || '',
      is_active: event.is_active,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(emptyForm)
  }

  const toggleActive = async (event: Event) => {
    const { error } = await supabase
      .from('events')
      .update({ is_active: !event.is_active })
      .eq('id', event.id)

    if (error) {
      setError('更新に失敗しました')
      return
    }
    fetchEvents()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">イベント管理</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      {/* フォーム */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">
          {editingId ? 'イベント編集' : '新規イベント作成'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">イベント名 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例: 東京ドーム公演 2026"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">アーティスト名 *</label>
              <input
                type="text"
                value={form.artist_name}
                onChange={(e) => setForm({ ...form, artist_name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例: アーティスト名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">開催日 *</label>
              <input
                type="date"
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">会場</label>
              <input
                type="text"
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例: 東京ドーム"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">有効にする</label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {saving ? '保存中...' : editingId ? '更新' : '作成'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 text-sm"
              >
                キャンセル
              </button>
            )}
          </div>
        </form>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">イベント名</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">アーティスト</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">開催日</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">会場</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">ステータス</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">読み込み中...</td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">イベントがありません</td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{event.name}</td>
                  <td className="px-4 py-3 text-sm">{event.artist_name}</td>
                  <td className="px-4 py-3 text-sm">{event.event_date}</td>
                  <td className="px-4 py-3 text-sm">{event.venue || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => toggleActive(event)}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        event.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {event.is_active ? '有効' : '無効'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => startEdit(event)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      編集
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
