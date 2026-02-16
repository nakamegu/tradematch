'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, GoodsMaster } from '@/lib/supabase';
import Image from 'next/image';

export default function RegisterPage() {
  const [goods, setGoods] = useState<GoodsMaster[]>([]);
  const [haveGoods, setHaveGoods] = useState<Record<string, number>>({});
  const [wantGoods, setWantGoods] = useState<Record<string, number>>({});
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
    const { data: eventData } = await supabase
      .from('events')
      .select('name')
      .eq('id', eventId)
      .single();

    if (eventData) {
      setEventName(eventData.name);
    }

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
    setHaveGoods((prev) => {
      if (prev[goodsId]) {
        const { [goodsId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [goodsId]: 1 };
    });
  };

  const adjustHaveQuantity = (goodsId: string, delta: number) => {
    setHaveGoods((prev) => {
      const current = prev[goodsId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const { [goodsId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [goodsId]: next };
    });
  };

  const toggleWantGood = (goodsId: string) => {
    setWantGoods((prev) => {
      if (prev[goodsId]) {
        const { [goodsId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [goodsId]: 1 };
    });
  };

  const adjustWantQuantity = (goodsId: string, delta: number) => {
    setWantGoods((prev) => {
      const current = prev[goodsId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const { [goodsId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [goodsId]: next };
    });
  };

  const haveCount = Object.values(haveGoods).reduce((sum, q) => sum + q, 0);
  const wantCount = Object.values(wantGoods).reduce((sum, q) => sum + q, 0);

  const handleNext = () => {
    if (Object.keys(haveGoods).length > 0 && Object.keys(wantGoods).length > 0) {
      localStorage.setItem('haveGoodsMap', JSON.stringify(haveGoods));
      localStorage.setItem('wantGoodsMap', JSON.stringify(wantGoods));
      router.push('/matching');
    }
  };

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

  const renderGoodsGrid = (
    items: GoodsMaster[],
    selectedMap: Record<string, number>,
    toggleFn: (id: string) => void,
    adjustFn: (id: string, delta: number) => void,
    selectedBg: string,
    selectedBorder: string,
    hoverBorder: string,
    buttonColor: string,
  ) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((good) => {
        const qty = selectedMap[good.id] || 0;
        const isSelected = qty > 0;
        return (
          <div
            key={good.id}
            onClick={() => toggleFn(good.id)}
            className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${
              isSelected
                ? `${selectedBg} ${selectedBorder}`
                : `bg-gray-50 border-gray-300 hover:${hoverBorder}`
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
            {isSelected && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <button
                  onClick={(e) => { e.stopPropagation(); adjustFn(good.id, -1); }}
                  className={`w-7 h-7 rounded-full ${buttonColor} text-white font-bold text-sm flex items-center justify-center`}
                >
                  -
                </button>
                <span className="text-sm font-bold w-6 text-center">{qty}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); adjustFn(good.id, 1); }}
                  className={`w-7 h-7 rounded-full ${buttonColor} text-white font-bold text-sm flex items-center justify-center`}
                >
                  +
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

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
            持っているグッズ
            <span className="text-sm font-normal text-gray-500">
              ({Object.keys(haveGoods).length}種類 / 合計{haveCount}個)
            </span>
          </h2>

          {Object.entries(groupedGoods).map(([category, items]) => (
            <div key={category} className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">
                {category}
              </h3>
              {renderGoodsGrid(
                items, haveGoods, toggleHaveGood, adjustHaveQuantity,
                'bg-purple-100', 'border-purple-500', 'border-purple-300', 'bg-purple-500',
              )}
            </div>
          ))}
        </div>

        {/* 欲しいグッズ */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-4">
          <h2 className="text-2xl font-bold text-pink-600 mb-4 flex items-center gap-2">
            欲しいグッズ
            <span className="text-sm font-normal text-gray-500">
              ({Object.keys(wantGoods).length}種類 / 合計{wantCount}個)
            </span>
          </h2>

          {Object.entries(groupedGoods).map(([category, items]) => (
            <div key={category} className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">
                {category}
              </h3>
              {renderGoodsGrid(
                items, wantGoods, toggleWantGood, adjustWantQuantity,
                'bg-pink-100', 'border-pink-500', 'border-pink-300', 'bg-pink-500',
              )}
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
            グッズを追加リクエスト
          </button>
        </div>

        {/* 次へボタン */}
        <button
          onClick={handleNext}
          disabled={Object.keys(haveGoods).length === 0 || Object.keys(wantGoods).length === 0}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          マッチング開始
        </button>
      </div>
    </main>
  );
}
