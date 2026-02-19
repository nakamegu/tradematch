'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase, Event, GoodsMaster, ImageCrop } from '@/lib/supabase'
import { uploadGoodsImage } from '@/lib/upload'
import ImageCropper from '@/components/ImageCropper'
import CroppedImage from '@/components/CroppedImage'

type GoodsForm = {
  name: string
  category: string
  description: string
  image_url: string
  image_crop: ImageCrop | null
}

const emptyForm: GoodsForm = {
  name: '',
  category: '',
  description: '',
  image_url: '',
  image_crop: null,
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
  const [imageTab, setImageTab] = useState<'upload' | 'url'>('upload')
  const [cropUrl, setCropUrl] = useState('')
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
      name: form.name,
      category: form.category,
      description: form.description,
      image_url: form.image_url,
      image_crop: form.image_crop,
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
    setImageTab('upload')
    setCropUrl('')
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
      image_crop: goods.image_crop || null,
    })
    if (goods.image_crop && goods.image_url) {
      setImageTab('url')
      setCropUrl(goods.image_url)
    } else {
      setImageTab('upload')
      setCropUrl('')
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(emptyForm)
    setImageTab('upload')
    setCropUrl('')
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
      <h1 className="text-2xl font-bold text-slate-100 mb-6">グッズ管理</h1>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 px-4 py-3 rounded-xl mb-4 text-sm">
          {success}
        </div>
      )}

      {/* イベント選択 */}
      <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
        <label className="block text-sm font-medium text-slate-600 mb-1">イベント選択</label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="w-full md:w-96 px-3 py-2 bg-slate-100 border border-slate-300 text-slate-800 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
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
          className={`px-4 py-2 rounded-xl text-sm ${!bulkMode ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          個別登録
        </button>
        <button
          onClick={() => { setBulkMode(true); setEditingId(null); setForm(emptyForm) }}
          className={`px-4 py-2 rounded-xl text-sm ${bulkMode ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          一括登録
        </button>
      </div>

      {/* 個別登録フォーム */}
      {!bulkMode && (
        <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">
            {editingId ? 'グッズ編集' : '新規グッズ作成'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">グッズ名 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 text-slate-800 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder-slate-400"
                  placeholder="例: アクリルスタンド A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">カテゴリ *</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 text-slate-800 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder-slate-400"
                  placeholder="例: アクリルスタンド"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">説明</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 text-slate-800 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder-slate-400"
                rows={2}
                placeholder="グッズの説明（任意）"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">画像</label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setImageTab('upload')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${imageTab === 'upload' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'}`}
                >
                  ファイルアップロード
                </button>
                <button
                  type="button"
                  onClick={() => setImageTab('url')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${imageTab === 'url' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'}`}
                >
                  URL指定+切り抜き
                </button>
              </div>

              {imageTab === 'upload' && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-500/20 file:text-indigo-600 hover:file:bg-indigo-500/30"
                  />
                  {uploading && <p className="text-sm text-slate-500 mt-1">アップロード中...</p>}
                  {form.image_url && !form.image_crop && (
                    <div className="mt-2 h-40 w-40 rounded-lg overflow-hidden bg-slate-200 flex items-center justify-center">
                      <img src={form.image_url} alt="プレビュー" className="max-w-full max-h-full object-contain" />
                    </div>
                  )}
                </>
              )}

              {imageTab === 'url' && (
                <div className="space-y-3">
                  <input
                    type="url"
                    value={cropUrl}
                    onChange={(e) => setCropUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 text-slate-800 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder-slate-400 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (cropUrl.trim()) {
                        setForm({ ...form, image_url: cropUrl.trim(), image_crop: null })
                      }
                    }}
                    disabled={!cropUrl.trim()}
                    className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-300 disabled:opacity-50"
                  >
                    画像を読み込む
                  </button>
                  {form.image_url && imageTab === 'url' && (
                    <>
                      <p className="text-xs text-slate-500">ドラッグで切り抜き範囲を選択（任意）</p>
                      <ImageCropper
                        imageUrl={form.image_url}
                        initialCrop={form.image_crop}
                        onCropChange={(crop) => setForm({ ...form, image_crop: crop })}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || uploading}
                className="bg-indigo-500 text-white px-4 py-2 rounded-xl hover:bg-indigo-400 disabled:opacity-50 text-sm font-semibold"
              >
                {saving ? '保存中...' : editingId ? '更新' : '作成'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl hover:bg-slate-300 text-sm"
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
        <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">一括登録</h2>
          <p className="text-sm text-slate-400 mb-3">
            1行につき「カテゴリ,グッズ名」の形式で入力してください。
          </p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className="w-full px-3 py-2 bg-slate-100 border border-slate-300 text-slate-800 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono text-sm placeholder-slate-400"
            rows={10}
            placeholder={`アクリルスタンド,メンバーA\nアクリルスタンド,メンバーB\nうちわ,メンバーA\nうちわ,メンバーB`}
          />
          <div className="mt-3">
            <button
              onClick={handleBulkInsert}
              disabled={saving || !bulkText.trim()}
              className="bg-indigo-500 text-white px-4 py-2 rounded-xl hover:bg-indigo-400 disabled:opacity-50 text-sm font-semibold"
            >
              {saving ? '登録中...' : '一括登録'}
            </button>
          </div>
        </div>
      )}

      {/* グッズ一覧 */}
      <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-100 border-b border-slate-300">
          <h2 className="text-sm font-medium text-slate-400">
            グッズ一覧（{goods.length}件）
          </h2>
        </div>
        {loading ? (
          <p className="px-4 py-8 text-center text-slate-500">読み込み中...</p>
        ) : goods.length === 0 ? (
          <p className="px-4 py-8 text-center text-slate-500">グッズがありません</p>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">画像</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">グッズ名</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">カテゴリ</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">ステータス</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {goods.map((g) => (
                <tr key={g.id} className="hover:bg-slate-200">
                  <td className="px-4 py-3">
                    {g.image_url ? (
                      <CroppedImage
                        src={g.image_url}
                        crop={g.image_crop}
                        alt={g.name}
                        className="h-10 w-10 object-cover rounded"
                      />
                    ) : (
                      <div className="h-10 w-10 bg-slate-200 rounded flex items-center justify-center text-slate-500 text-xs">
                        No img
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{g.name}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 bg-slate-200 rounded text-xs text-slate-600">{g.category}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      g.status === 'active' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-slate-200 text-slate-400'
                    }`}>
                      {g.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-3">
                      <button
                        onClick={() => startEdit(g)}
                        className="text-indigo-600 hover:text-indigo-500"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(g.id)}
                        className="text-red-600 hover:text-red-500"
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
