'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, GoodsMaster } from '@/lib/supabase';
import Image from 'next/image';

export default function RegisterPage() {
  const [goods, setGoods] = useState<GoodsMaster[]>([]);
  const [haveGoods, setHaveGoods] = useState<string[]>([]);
  const [wantGoods, setWantGoods] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState('');
  const router = useRouter();

  useEffect(() => {
    const eventId = localStorage.getItem('selectedEventId');
    if (!eventId) {
      router.push('/select-event');
      return;
    }
    fetchGoods(eventId);
  }, [router]);

  const fetchGoods = async (eventId: string) => {
    // イベント情報を取得
    const { data: eventData } = await supabase
      .from('events')
      .select('name')
      .eq('id', eventId)
      .single();

    if (eventData) {
      setEventName(eventData.name);
    }

    // グッズ一覧を取得
    const { data, error } = await supabase
      .from('goods_master')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'active')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching goods:', error);
    } else {
      setGoods(data || []);
    }
    setLoading(false);
  };

  const toggleHaveGood = (goodsId: string) => {
    if (haveGoods.includes(goodsId)) {
      setHaveGoods(haveGoods.filter(g => g !== goodsId));
    } else {
      setHaveGoods([...haveGoods, goodsId]);
    }
  };

  const toggleWantGood = (goodsId: string) => {
    if (wantGoods.includes(goodsId)) {
      setWantGoods(wantGoods.filter(g => g !== goodsId));
    } else {
      setWantGoods([...wantGoods, goodsId]);
    }
  };

  const handleNext = () => {
    if (haveGoods.length > 0 && wantGoods.length > 0) {
      localStorage.setItem('haveGoodsIds', JSON.stringify(haveGoods));
      localStorage.setItem('wantGoodsIds', JSON.stringify(wantGoods));
      router.push('/matching');
    }
  };

  // カテゴリーごとにグループ化
  const groupedGoods = goods.reduce((acc, good) => {
    const category = good.category || 'その他';
    if (!acc[category]) acc[category] = [];
    acc[category].push(good);
    return acc;
  }, {} as Record<string, GoodsMaster[]>);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-500">
        <div className="text-white text-2xl">読み込み中...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-4">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">グッズ登録</h1>
          <p className="text-gray-600">{eventName}</p>
        </div>

        {/* 持っているグッズ */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-4">
          <h2 className="text-2xl font-bold text-purple-600 mb-4 flex items-center gap-2">
            ✅ 持っているグッズ
            <span className="text-sm font-normal text-gray-500">
              ({haveGoods.length}個選択中)
            </span>
          </h2>

          {Object.entries(groupedGoods).map(([category, items]) => (
            <div key={category} className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">
                {category}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {items.map((good) => (
                  <button
                    key={good.id}
                    onClick={() => toggleHaveGood(good.id)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      haveGoods.includes(good.id)
                        ? 'bg-purple-100 border-purple-500'
                        : 'bg-gray-50 border-gray-300 hover:border-purple-300'
                    }`}
                  >
                    {good.image_url && (
                      <div className="relative w-full h-24 mb-2">
                        <Image
                          src={good.image_url}
                          alt={good.name}
                          fill
                          className="object-cover rounded-lg"
                        />
                      </div>
                    )}
                    <p className="text-sm font-medium text-gray-800">
                      {good.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 欲しいグッズ */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-4">
          <h2 className="text-2xl font-bold text-pink-600 mb-4 flex items-center gap-2">
            ❤️ 欲しいグッズ
            <span className="text-sm font-normal text-gray-500">
              ({wantGoods.length}個選択中)
            </span>
          </h2>

          {Object.entries(groupedGoods).map(([category, items]) => (
            <div key={category} className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">
                {category}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {items.map((good) => (
                  <button
                    key={good.id}
                    onClick={() => toggleWantGood(good.id)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      wantGoods.includes(good.id)
                        ? 'bg-pink-100 border-pink-500'
                        : 'bg-gray-50 border-gray-300 hover:border-pink-300'
                    }`}
                  >
                    {good.image_url && (
                      <div className="relative w-full h-24 mb-2">
                        <Image
                          src={good.image_url}
                          alt={good.name}
                          fill
                          className="object-cover rounded-lg"
                        />
                      </div>
                    )}
                    <p className="text-sm font-medium text-gray-800">
                      {good.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* グッズリクエストボタン */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-4">
          <p className="text-gray-700 mb-3">
            探しているグッズが見つかりませんか？
          </p>
          <button
            onClick={() => router.push('/request-goods')}
            className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          >
            📝 グッズを追加リクエスト
          </button>
        </div>

        {/* 次へボタン */}
        <button
          onClick={handleNext}
          disabled={haveGoods.length === 0 || wantGoods.length === 0}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          マッチング開始 →
        </button>
      </div>
    </main>
  );
}
