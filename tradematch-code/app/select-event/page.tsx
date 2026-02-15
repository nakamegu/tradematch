'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Event } from '@/lib/supabase';

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
      setEvents(data || []);
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
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
