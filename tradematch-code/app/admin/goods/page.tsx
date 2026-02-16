'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase, Event, GoodsMaster } from '@/lib/supabase'
import { uploadGoodsImage } from '@/lib/upload'

type GoodsForm = {
  name: string
  category: string
  description: string
  image_url: string
}

const emptyForm: GoodsForm = {
  name: '',
  category: '',
  description: '',
  image_url: '',
}

export default function GoodsManagementPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [goods, setGoods] = useState<GoodsMaster[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<GoodsForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploading, setUploading] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkMode, setBulkMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false })
      setEvents(data || [])
      if (data && data.length > 0) {
        setSelectedEventId(data[0].id)
      }
      setLoading(false)
    }
    fetchEvents()
  }, [])

  useEffect(() => {
    if (selectedEventId) {
      fetchGoods()
    }
  }, [selectedEventId])

  const fetchGoods = async () => {
    const { data, error } = await supabase
      .from('goods_master')
      .select('*')
      .eq('event_id', selectedEventId)
      .order('category')

    if (error) {
      setError('グッズの取得に失敗しました')
      return
    }
    setGoods(data || [])
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const url = await uploadGoodsImage(file)
    setUploading(false)

    if (url) {
      setForm({ ...form, image_url: url })
    } else {
      setError('画像のアップロードに失敗しました')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEventId) {
      setError('イベントを選択してください')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    const payload = {
      ...form,
      event_id: selectedEventId,
      is_official: true,
      status: 'active',
    }

    if (editingId) {
      const { error } = await supabase
        .from('goods_master')
        .update(payload)
        .eq('id', editingId)

      if (error) {
        setError('更新に失敗しました: ' + error.message)
        setSaving(false)
        return
      }
      setSuccess('グッズを更新しました')
    } else {
      const { error } = await supabase
        .from('goods_master')
        .insert(payload)

      if (error) {
        setError('作成に失敗しました: ' + error.message)
        setSaving(false)
        return
      }
      setSuccess('グッズを作成しました')
    }

    setForm(emptyForm)
    setEditingId(null)
    setSaving(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    fetchGoods()
  }

  const handleBulkInsert = async () => {
    if (!selectedEventId) {
      setError('イベントを選択してください')
      return
    }

    const lines = bulkText.trim().split('\n').filter(line => line.trim())
    if (lines.length === 0) {
      setError('データを入力してください')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    const items = lines.map(line => {
      const [category, name] = line.split(',').map(s => s.trim())
      return {
        event_id: selectedEventId,
        category: category || '未分類',
        name: name || category,
        is_official: true,
        status: 'active',
      }
    })

    const { error } = await supabase
      .from('goods_master')
      .insert(items)

    if (error) {
      setError('一括登録に失敗しました: ' + error.message)
      setSaving(false)
      return
    }

    setSuccess(`${items.length}件のグッズを登録しました`)
    setBulkText('')
    setSaving(false)
    fetchGoods()
  }

  const startEdit = (goods: GoodsMaster) => {
    setEditingId(goods.id)
    setBulkMode(false)
    setForm({
      name: goods.name,
      category: goods.category,
      description: goods.description || '',
      image_url: goods.image_url || '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(emptyForm)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このグッズを削除しますか？')) return

    const { error } = await supabase
      .from('goods_master')
      .delete()
      .eq('id', id)

    if (error) {
      setError('削除に失敗しました: ' + error.message)
      return
    }
    setSuccess('グッズを削除しました')
    fetchGoods()
  }

  // カテゴリごとにグループ化
  const groupedGoods = goods.reduce((acc, g) => {
    if (!acc[g.category]) acc[g.category] = []
    acc[g.category].push(g)
    return acc
  }, {} as Record<string, GoodsMaster[]>)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">グッズ管理</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 text-sm">
          {success}
        </div>
      )}

      {/* イベント選択 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">イベント選択</label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name} ({event.artist_name})
            </option>
          ))}
        </select>
      </div>

      {/* モード切り替え */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setBulkMode(false); setEditingId(null) }}
          className={`px-4 py-2 rounded-md text-sm ${!bulkMode ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          個別登録
        </button>
        <button
          onClick={() => { setBulkMode(true); setEditingId(null); setForm(emptyForm) }}
          className={`px-4 py-2 rounded-md text-sm ${bulkMode ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          一括登録
        </button>
      </div>

      {/* 個別登録フォーム */}
      {!bulkMode && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">
            {editingId ? 'グッズ編集' : '新規グッズ作成'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">グッズ名 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: アクリルスタンド A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ *</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: アクリルスタンド"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="グッズの説明（任意）"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">画像</label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {uploading && <p className="text-sm text-gray-500 mt-1">アップロード中...</p>}
              {form.image_url && (
                <div className="mt-2">
                  <img src={form.image_url} alt="プレビュー" className="h-20 w-20 object-cover rounded" />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || uploading}
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
      )}

      {/* 一括登録フォーム */}
      {bulkMode && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">一括登録</h2>
          <p className="text-sm text-gray-500 mb-3">
            1行につき「カテゴリ,グッズ名」の形式で入力してください。
          </p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            rows={10}
            placeholder={`アクリルスタンド,メンバーA\nアクリルスタンド,メンバーB\nうちわ,メンバーA\nうちわ,メンバーB`}
          />
          <div className="mt-3">
            <button
              onClick={handleBulkInsert}
              disabled={saving || !bulkText.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {saving ? '登録中...' : '一括登録'}
            </button>
          </div>
        </div>
      )}

      {/* グッズ一覧 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h2 className="text-sm font-medium text-gray-600">
            グッズ一覧（{goods.length}件）
          </h2>
        </div>
        {loading ? (
          <p className="px-4 py-8 text-center text-gray-500">読み込み中...</p>
        ) : goods.length === 0 ? (
          <p className="px-4 py-8 text-center text-gray-500">グッズがありません</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">画像</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">グッズ名</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">カテゴリ</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">ステータス</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {goods.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {g.image_url ? (
                      <img src={g.image_url} alt={g.name} className="h-10 w-10 object-cover rounded" />
                    ) : (
                      <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
                        No img
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">{g.name}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">{g.category}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      g.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {g.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-3">
                      <button
                        onClick={() => startEdit(g)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(g.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
