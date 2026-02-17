'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Event } from '@/lib/supabase';

function isInPeriod(now: string, start?: string, end?: string): boolean {
  if (!start && !end) return false; // no period configured = not "in" this period
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SelectEventPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_active', true)
      .order('event_date', { ascending: false });

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
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
        <div className="text-white text-2xl">読み込み中...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-4">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            イベントを選択
          </h1>
          <p className="text-gray-600">
            参加するイベントを選んでください
          </p>
        </div>

        <div className="space-y-4">
          {events.map((event) => (
            <button
              key={event.id}
              onClick={() => handleSelectEvent(event.id)}
              className="w-full bg-white rounded-3xl shadow-2xl p-6 text-left hover:shadow-xl transform hover:scale-105 transition-all"
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {event.name}
              </h2>
              <p className="text-purple-600 font-semibold mb-2">
                {event.artist_name}
              </p>
              {event.event_date && (
                <p className="text-gray-600 text-sm">
                  📅 {new Date(event.event_date).toLocaleDateString('ja-JP')}
                </p>
              )}
              {event.venue && (
                <p className="text-gray-600 text-sm">
                  📍 {event.venue}
                </p>
              )}
              {(event.register_start || event.register_end) && (
                <p className="text-gray-500 text-xs mt-1">
                  📝 登録: {event.register_start ? formatDateTime(event.register_start) : ''}
                  {event.register_start && event.register_end ? ' 〜 ' : ''}
                  {event.register_end ? formatDateTime(event.register_end) : ''}
                </p>
              )}
              {(event.trade_start || event.trade_end) && (
                <p className="text-gray-500 text-xs mt-1">
                  🔄 交換: {event.trade_start ? formatDateTime(event.trade_start) : ''}
                  {event.trade_start && event.trade_end ? ' 〜 ' : ''}
                  {event.trade_end ? formatDateTime(event.trade_end) : ''}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
