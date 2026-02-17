'use client'

import { useEffect, useState } from 'react'
import { supabase, Event } from '@/lib/supabase'
import LocationPickerMapWrapper from '@/components/LocationPickerMapWrapper'

type LocationForm = {
  latitude: string
  longitude: string
  radius_km: string
}

const emptyLocation: LocationForm = { latitude: '', longitude: '', radius_km: '1.0' }

type EventForm = {
  name: string
  artist_name: string
  event_date: string
  venue: string
  is_active: boolean
  register_start: string
  register_end: string
  trade_start: string
  trade_end: string
  locations: [LocationForm, LocationForm, LocationForm]
}

const emptyForm: EventForm = {
  name: '',
  artist_name: '',
  event_date: '',
  venue: '',
  is_active: true,
  register_start: '',
  register_end: '',
  trade_start: '',
  trade_end: '',
  locations: [{ ...emptyLocation }, { ...emptyLocation }, { ...emptyLocation }],
}

// datetime-local value ("2026-02-17T20:30") → ISO string with local timezone offset
function localToISO(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return d.toISOString();
}

// ISO/UTC string from DB → datetime-local value in local timezone
function isoToLocal(value?: string): string {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

  const updateLocation = (index: number, update: Partial<LocationForm>) => {
    setForm(prev => {
      const locations = [...prev.locations] as [LocationForm, LocationForm, LocationForm]
      locations[index] = { ...locations[index], ...update }
      return { ...prev, locations }
    })
  }

  const clearLocation = (index: number) => {
    updateLocation(index, { latitude: '', longitude: '', radius_km: '1.0' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const [loc1, loc2, loc3] = form.locations

    const payload: Record<string, unknown> = {
      name: form.name,
      artist_name: form.artist_name,
      event_date: form.event_date,
      venue: form.venue,
      is_active: form.is_active,
      register_start: localToISO(form.register_start),
      register_end: localToISO(form.register_end),
      trade_start: localToISO(form.trade_start),
      trade_end: localToISO(form.trade_end),
      latitude: loc1.latitude ? parseFloat(loc1.latitude) : null,
      longitude: loc1.longitude ? parseFloat(loc1.longitude) : null,
      radius_km: loc1.radius_km ? parseFloat(loc1.radius_km) : 1.0,
      latitude2: loc2.latitude ? parseFloat(loc2.latitude) : null,
      longitude2: loc2.longitude ? parseFloat(loc2.longitude) : null,
      radius_km2: loc2.radius_km ? parseFloat(loc2.radius_km) : 1.0,
      latitude3: loc3.latitude ? parseFloat(loc3.latitude) : null,
      longitude3: loc3.longitude ? parseFloat(loc3.longitude) : null,
      radius_km3: loc3.radius_km ? parseFloat(loc3.radius_km) : 1.0,
    }

    if (editingId) {
      const { error } = await supabase
        .from('events')
        .update(payload)
        .eq('id', editingId)

      if (error) {
        setError('更新に失敗しました: ' + error.message)
        setSaving(false)
        return
      }
    } else {
      const { error } = await supabase
        .from('events')
        .insert(payload)

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
      register_start: isoToLocal(event.register_start),
      register_end: isoToLocal(event.register_end),
      trade_start: isoToLocal(event.trade_start),
      trade_end: isoToLocal(event.trade_end),
      locations: [
        {
          latitude: event.latitude != null ? String(event.latitude) : '',
          longitude: event.longitude != null ? String(event.longitude) : '',
          radius_km: event.radius_km != null ? String(event.radius_km) : '1.0',
        },
        {
          latitude: event.latitude2 != null ? String(event.latitude2) : '',
          longitude: event.longitude2 != null ? String(event.longitude2) : '',
          radius_km: event.radius_km2 != null ? String(event.radius_km2) : '1.0',
        },
        {
          latitude: event.latitude3 != null ? String(event.latitude3) : '',
          longitude: event.longitude3 != null ? String(event.longitude3) : '',
          radius_km: event.radius_km3 != null ? String(event.radius_km3) : '1.0',
        },
      ],
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

  const locationLabels = ['会場エリア1', '会場エリア2', '会場エリア3']

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

          {/* 登録可能期間 */}
          <fieldset className="border border-gray-200 rounded-lg p-4">
            <legend className="text-sm font-semibold text-gray-700 px-1">アイテム登録可能期間</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">開始日時</label>
                <input
                  type="datetime-local"
                  value={form.register_start}
                  onChange={(e) => setForm({ ...form, register_start: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">終了日時</label>
                <input
                  type="datetime-local"
                  value={form.register_end}
                  onChange={(e) => setForm({ ...form, register_end: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </fieldset>

          {/* 交換可能期間 */}
          <fieldset className="border border-gray-200 rounded-lg p-4">
            <legend className="text-sm font-semibold text-gray-700 px-1">交換可能期間</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">開始日時</label>
                <input
                  type="datetime-local"
                  value={form.trade_start}
                  onChange={(e) => setForm({ ...form, trade_start: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">終了日時</label>
                <input
                  type="datetime-local"
                  value={form.trade_end}
                  onChange={(e) => setForm({ ...form, trade_end: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </fieldset>

          {/* 会場エリア1〜3 */}
          <div className="space-y-4">
            {form.locations.map((loc, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">{locationLabels[i]}</h3>
                  {(loc.latitude || loc.longitude) && (
                    <button
                      type="button"
                      onClick={() => clearLocation(i)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      クリア
                    </button>
                  )}
                </div>
                <div className="mb-3">
                  <LocationPickerMapWrapper
                    lat={loc.latitude ? parseFloat(loc.latitude) : undefined}
                    lng={loc.longitude ? parseFloat(loc.longitude) : undefined}
                    radiusKm={loc.radius_km ? parseFloat(loc.radius_km) : undefined}
                    onChange={(lat, lng) => {
                      updateLocation(i, {
                        latitude: String(lat),
                        longitude: String(lng),
                      })
                    }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">緯度</label>
                    <input
                      type="number"
                      step="any"
                      value={loc.latitude}
                      onChange={(e) => updateLocation(i, { latitude: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="35.7056"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">経度</label>
                    <input
                      type="number"
                      step="any"
                      value={loc.longitude}
                      onChange={(e) => updateLocation(i, { longitude: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="139.7519"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">半径 (km)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={loc.radius_km}
                      onChange={(e) => updateLocation(i, { radius_km: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="1.0"
                    />
                  </div>
                </div>
              </div>
            ))}
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
