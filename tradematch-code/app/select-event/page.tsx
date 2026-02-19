'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, Event } from '@/lib/supabase';
import EventAreaMapWrapper from '@/components/EventAreaMapWrapper';
import { ClipboardList, Repeat, MapPin } from 'lucide-react';

function isInPeriod(now: string, start?: string, end?: string): boolean {
  if (!start && !end) return false; // no period configured = not "in" this period
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getEventAreas(event: Event) {
  const areas: { lat: number; lng: number; radiusKm: number }[] = [];
  if (event.latitude && event.longitude) {
    areas.push({ lat: event.latitude, lng: event.longitude, radiusKm: event.radius_km ?? 1 });
  }
  if (event.latitude2 && event.longitude2) {
    areas.push({ lat: event.latitude2, lng: event.longitude2, radiusKm: event.radius_km2 ?? 1 });
  }
  if (event.latitude3 && event.longitude3) {
    areas.push({ lat: event.latitude3, lng: event.longitude3, radiusKm: event.radius_km3 ?? 1 });
  }
  return areas;
}

export default function SelectEventPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-[#1a2d4a]">
        <div className="text-slate-400 text-2xl">読み込み中...</div>
      </main>
    }>
      <SelectEventContent />
    </Suspense>
  );
}

function SelectEventContent() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const singleEventId = searchParams.get('event');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    let query = supabase
      .from('events')
      .select('*')
      .eq('is_active', true)
      .order('event_date', { ascending: false });

    if (singleEventId) {
      query = query.eq('id', singleEventId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching events:', error);
    } else {
      const now = new Date().toISOString();
      const filtered = (data || []).filter((e: Event) => {
        const inRegister = isInPeriod(now, e.register_start, e.register_end);
        const inTrade = isInPeriod(now, e.trade_start, e.trade_end);
        // Show if in either period, or if neither period is configured
        const hasAnyPeriod = e.register_start || e.register_end || e.trade_start || e.trade_end;
        return !hasAnyPeriod || inRegister || inTrade;
      });
      setEvents(filtered);
    }
    setLoading(false);
  };

  const handleSelectEvent = (eventId: string) => {
    localStorage.setItem('selectedEventId', eventId);
    router.push('/register');
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#1a2d4a]">
        <div className="text-slate-400 text-2xl">読み込み中...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#1a2d4a] p-4">
      <div className="max-w-2xl mx-auto">
        {!singleEventId && (
          <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 p-6 mb-4">
            <p className="text-slate-400">
              参加する公演を選んでください
            </p>
          </div>
        )}

        <div className="space-y-4">
          {events.map((event) => {
            const areas = getEventAreas(event);
            const now = new Date().toISOString();
            const hasRegisterPeriod = !!(event.register_start || event.register_end);
            const inRegister = hasRegisterPeriod ? isInPeriod(now, event.register_start, event.register_end) : true;

            return (
              <div
                key={event.id}
                className="w-full bg-slate-50 rounded-xl shadow-sm border border-slate-200 overflow-hidden"
              >
                <div className="flex">
                  {/* 左: 画像 1/3 */}
                  {event.image_url && (
                    <div className="w-1/3 shrink-0 bg-slate-200 flex items-center justify-center">
                      <img
                        src={event.image_url}
                        alt={event.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  {/* 右: 情報 */}
                  <div className={`flex-1 p-4 flex flex-col gap-2 ${!event.image_url ? 'w-full' : ''}`}>
                    <h2 className="text-lg font-bold text-slate-800 leading-tight">
                      {event.name}
                    </h2>
                    <p className="text-indigo-600 font-semibold text-sm">
                      {event.artist_name}
                    </p>

                    {event.venue && (
                      <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{event.venue}</span>
                      </div>
                    )}

                    {/* 可能期間 */}
                    {((event.register_start || event.register_end) || (event.trade_start || event.trade_end)) && (
                      <div className="flex flex-col gap-1">
                        {(event.register_start || event.register_end) && (
                          <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md">
                            <ClipboardList className="w-3 h-3 shrink-0" />
                            <span className="text-[10px] font-semibold">登録できる期間</span>
                            <span className="text-[10px] text-indigo-400 ml-auto">
                              {event.register_start ? formatDateTime(event.register_start) : ''}
                              {event.register_start && event.register_end ? ' 〜 ' : ''}
                              {event.register_end ? formatDateTime(event.register_end) : ''}
                            </span>
                          </div>
                        )}
                        {(event.trade_start || event.trade_end) && (
                          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md">
                            <Repeat className="w-3 h-3 shrink-0" />
                            <span className="text-[10px] font-semibold">交換できる期間</span>
                            <span className="text-[10px] text-emerald-400 ml-auto">
                              {event.trade_start ? formatDateTime(event.trade_start) : ''}
                              {event.trade_start && event.trade_end ? ' 〜 ' : ''}
                              {event.trade_end ? formatDateTime(event.trade_end) : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* エリア地図 */}
                    {areas.length > 0 && (
                      <div className="mt-auto">
                        <EventAreaMapWrapper areas={areas} />
                      </div>
                    )}
                  </div>
                </div>

                {/* ボトムアクション */}
                {inRegister ? (
                  <button
                    onClick={() => handleSelectEvent(event.id)}
                    className="w-full bg-indigo-500 hover:bg-indigo-400 text-white py-3 font-bold text-lg transition-colors rounded-b-xl"
                  >
                    グッズを登録する
                  </button>
                ) : (
                  <div className="w-full bg-slate-200 text-slate-400 py-3 font-bold text-center text-sm rounded-b-xl">
                    現在は登録期間外です
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
