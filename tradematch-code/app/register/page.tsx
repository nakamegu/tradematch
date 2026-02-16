'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, GoodsMaster } from '@/lib/supabase';
import Image from 'next/image';

interface TradeGroup {
  have: Record<string, number>;
  wantItems: string[];
  wantQuantity: number;
}

const emptyGroup = (): TradeGroup => ({
  have: {},
  wantItems: [],
  wantQuantity: 1,
});

export default function RegisterPage() {
  const [goods, setGoods] = useState<GoodsMaster[]>([]);
  const [tradeGroups, setTradeGroups] = useState<TradeGroup[]>([emptyGroup()]);
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState('');
  const [expandedGroup, setExpandedGroup] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const eventId = localStorage.getItem('selectedEventId');
    if (!eventId) {
      router.push('/select-event');
      return;
    }

    // Restore tradeGroups from localStorage if available
    const saved = localStorage.getItem('tradeGroups');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as TradeGroup[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTradeGroups(parsed);
        }
      } catch {
        // ignore parse errors, keep default
      }
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

  const updateGroup = (index: number, updater: (g: TradeGroup) => TradeGroup) => {
    setTradeGroups((prev) => prev.map((g, i) => (i === index ? updater(g) : g)));
  };

  const toggleHave = (groupIdx: number, goodsId: string) => {
    updateGroup(groupIdx, (g) => {
      const have = { ...g.have };
      if (have[goodsId]) {
        delete have[goodsId];
      } else {
        have[goodsId] = 1;
      }
      return { ...g, have };
    });
  };

  const adjustHaveQty = (groupIdx: number, goodsId: string, delta: number) => {
    updateGroup(groupIdx, (g) => {
      const have = { ...g.have };
      const next = (have[goodsId] || 0) + delta;
      if (next <= 0) {
        delete have[goodsId];
      } else {
        have[goodsId] = next;
      }
      return { ...g, have };
    });
  };

  const toggleWant = (groupIdx: number, goodsId: string) => {
    updateGroup(groupIdx, (g) => {
      const wantItems = g.wantItems.includes(goodsId)
        ? g.wantItems.filter((id) => id !== goodsId)
        : [...g.wantItems, goodsId];
      return { ...g, wantItems };
    });
  };

  const adjustWantQuantity = (groupIdx: number, delta: number) => {
    updateGroup(groupIdx, (g) => {
      const next = g.wantQuantity + delta;
      return { ...g, wantQuantity: Math.max(1, next) };
    });
  };

  const addGroup = () => {
    setTradeGroups((prev) => [...prev, emptyGroup()]);
    setExpandedGroup(tradeGroups.length);
  };

  const removeGroup = (index: number) => {
    if (tradeGroups.length <= 1) return;
    setTradeGroups((prev) => prev.filter((_, i) => i !== index));
    setExpandedGroup((prev) => Math.min(prev, tradeGroups.length - 2));
  };

  const isValid = tradeGroups.every(
    (g) => Object.keys(g.have).length > 0 && g.wantItems.length > 0
  );

  const handleNext = () => {
    if (!isValid) return;
    localStorage.setItem('tradeGroups', JSON.stringify(tradeGroups));
    // Clean up old keys
    localStorage.removeItem('haveGoodsMap');
    localStorage.removeItem('wantGoodsMap');
    router.push('/matching');
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
    adjustFn: ((id: string, delta: number) => void) | null,
    selectedBg: string,
    selectedBorder: string,
    buttonColor: string,
  ) => (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
      {items.map((good) => {
        const qty = selectedMap[good.id] || 0;
        const isSelected = qty > 0;
        return (
          <div
            key={good.id}
            onClick={() => toggleFn(good.id)}
            className={`p-2 rounded-xl border-2 transition-all cursor-pointer text-center ${
              isSelected
                ? `${selectedBg} ${selectedBorder}`
                : 'bg-gray-50 border-gray-300'
            }`}
          >
            {good.image_url && (
              <div className="relative w-full h-16 mb-1">
                <Image
                  src={good.image_url}
                  alt={good.name}
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
            )}
            <p className="text-xs font-medium text-gray-800 leading-tight">
              {good.name}
            </p>
            {isSelected && adjustFn && (
              <div className="flex items-center justify-center gap-1 mt-1">
                <button
                  onClick={(e) => { e.stopPropagation(); adjustFn(good.id, -1); }}
                  className={`w-6 h-6 rounded-full ${buttonColor} text-white font-bold text-xs flex items-center justify-center`}
                >
                  -
                </button>
                <span className="text-xs font-bold w-5 text-center">{qty}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); adjustFn(good.id, 1); }}
                  className={`w-6 h-6 rounded-full ${buttonColor} text-white font-bold text-xs flex items-center justify-center`}
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

  // For want items, create a map where selected = 1 (no per-item quantity)
  const makeWantMap = (wantItems: string[]): Record<string, number> => {
    const m: Record<string, number> = {};
    wantItems.forEach((id) => { m[id] = 1; });
    return m;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-4">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">グッズ登録</h1>
          <p className="text-gray-600">{eventName}</p>
        </div>

        {/* 交換セット一覧 */}
        {tradeGroups.map((group, idx) => {
          const isExpanded = expandedGroup === idx;
          const haveCount = Object.values(group.have).reduce((s, q) => s + q, 0);
          const wantCount = group.wantItems.length;

          return (
            <div key={idx} className="bg-white rounded-3xl shadow-2xl mb-4 overflow-hidden">
              {/* グループヘッダー */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer bg-gradient-to-r from-purple-50 to-pink-50"
                onClick={() => setExpandedGroup(isExpanded ? -1 : idx)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-purple-700">
                    交換セット {idx + 1}
                  </span>
                  <span className="text-sm text-gray-500">
                    出:{Object.keys(group.have).length}種{haveCount}個 / 欲:{wantCount}種×{group.wantQuantity}個
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {tradeGroups.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeGroup(idx); }}
                      className="w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm flex items-center justify-center hover:bg-red-200"
                    >
                      ×
                    </button>
                  )}
                  <span className="text-gray-400 text-xl">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="p-4">
                  {/* 出すグッズ */}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-purple-600 mb-3 flex items-center gap-2">
                      出すグッズ
                      <span className="text-sm font-normal text-gray-500">
                        ({Object.keys(group.have).length}種類 / 合計{haveCount}個)
                      </span>
                    </h3>
                    {Object.entries(groupedGoods).map(([category, items]) => (
                      <div key={category} className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                          {category}
                        </h4>
                        {renderGoodsGrid(
                          items,
                          group.have,
                          (id) => toggleHave(idx, id),
                          (id, d) => adjustHaveQty(idx, id, d),
                          'bg-purple-100', 'border-purple-500', 'bg-purple-500',
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 欲しいグッズ */}
                  <div>
                    <h3 className="text-lg font-bold text-pink-600 mb-3 flex items-center gap-2">
                      欲しいグッズ
                      <span className="text-sm font-normal text-gray-500">
                        ({wantCount}種類から)
                      </span>
                    </h3>
                    {Object.entries(groupedGoods).map(([category, items]) => (
                      <div key={category} className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                          {category}
                        </h4>
                        {renderGoodsGrid(
                          items,
                          makeWantMap(group.wantItems),
                          (id) => toggleWant(idx, id),
                          null,
                          'bg-pink-100', 'border-pink-500', 'bg-pink-500',
                        )}
                      </div>
                    ))}

                    {/* 合計数量 */}
                    <div className="mt-4 flex items-center gap-3 bg-pink-50 rounded-xl p-3">
                      <span className="text-sm font-semibold text-pink-700">
                        欲しい合計数:
                      </span>
                      <button
                        onClick={() => adjustWantQuantity(idx, -1)}
                        className="w-8 h-8 rounded-full bg-pink-500 text-white font-bold flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="text-lg font-bold text-pink-700 w-8 text-center">
                        {group.wantQuantity}
                      </span>
                      <button
                        onClick={() => adjustWantQuantity(idx, 1)}
                        className="w-8 h-8 rounded-full bg-pink-500 text-white font-bold flex items-center justify-center"
                      >
                        +
                      </button>
                      <span className="text-xs text-gray-500">
                        上記{wantCount}種類のうちどれでも{group.wantQuantity}個
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* 交換セット追加ボタン */}
        <button
          onClick={addGroup}
          className="w-full bg-white bg-opacity-20 backdrop-blur text-white py-3 rounded-xl font-bold text-lg border-2 border-white border-opacity-30 hover:bg-opacity-30 transition-all mb-4"
        >
          + 交換セットを追加
        </button>

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
          disabled={!isValid}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          マッチング開始
        </button>
      </div>
    </main>
  );
}
