'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, GoodsMaster, Event } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/auth';
import { useDeleteAccount } from '@/lib/useDeleteAccount';
import type { RealtimeChannel } from '@supabase/supabase-js';
import Image from 'next/image';
import { Plus, X, ChevronUp, ChevronDown, Bell } from 'lucide-react';

interface TradeGroup {
  have: Record<string, number>;
  wantItems: string[];
  wantQuantity: number;
  giveCount: number;
}

const RATIO_PRESETS: [number, number][] = [
  [1, 1],
  [2, 1],
  [1, 2],
  [3, 1],
  [1, 3],
];

const emptyGroup = (): TradeGroup => ({
  have: {},
  wantItems: [],
  wantQuantity: 1,
  giveCount: 1,
});

export default function RegisterPage() {
  const [goods, setGoods] = useState<GoodsMaster[]>([]);
  const [tradeGroups, setTradeGroups] = useState<TradeGroup[]>([emptyGroup()]);
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState('');
  const [eventData, setEventData] = useState<Event | null>(null);
  const [expandedGroup, setExpandedGroup] = useState(0);
  const [restored, setRestored] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState<{
    matchRecordId: string;
    requesterName: string;
    colorCode: string | null;
    requesterId: string;
    theyOffer: { name: string; quantity: number }[];
    theyWant: { name: string; quantity: number }[];
  } | null>(null);
  const matchChannelRef = useRef<RealtimeChannel | null>(null);
  const router = useRouter();
  const { showDeleteConfirm, setShowDeleteConfirm, deleting, handleDeleteAllData } = useDeleteAccount();

  useEffect(() => {
    const nickname = localStorage.getItem('nickname');
    if (!nickname || !nickname.trim()) {
      router.push('/');
      return;
    }

    const eventId = localStorage.getItem('selectedEventId');
    if (!eventId) {
      router.push('/select-event');
      return;
    }

    // Restore tradeGroups from localStorage (event-specific key)
    const saved = localStorage.getItem(`tradeGroups_${eventId}`);
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
    setRestored(true);

    fetchGoods(eventId);
  }, [router]);

  // Auto-save tradeGroups to localStorage on every change (only after restore)
  useEffect(() => {
    if (!restored) return;
    const eventId = localStorage.getItem('selectedEventId');
    if (eventId) {
      localStorage.setItem(`tradeGroups_${eventId}`, JSON.stringify(tradeGroups));
    }
    localStorage.setItem('tradeGroups', JSON.stringify(tradeGroups));
  }, [tradeGroups, restored]);

  // Subscribe to incoming match requests
  useEffect(() => {
    let cancelled = false;

    const setup = setTimeout(async () => {
      if (cancelled) return;
      const userId = await getCurrentUserId();
      if (!userId || cancelled) return;

      const channelId = Date.now().toString();
      const channel = supabase
        .channel(`register_matches_${channelId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'matches' },
          async (payload) => {
            const newMatch = payload.new as {
              id: string;
              user1_id: string;
              user2_id: string;
              color_code: string | null;
            };
            if (newMatch.user2_id === userId) {
              // Fetch requester info, both users' goods, and goods names in parallel
              const [requesterRes, theirGoodsRes, myGoodsRes, goodsNamesRes] = await Promise.all([
                supabase.from('users').select('nickname').eq('id', newMatch.user1_id).single(),
                supabase.from('user_goods').select('goods_id, type, quantity, group_id').eq('user_id', newMatch.user1_id),
                supabase.from('user_goods').select('goods_id, type, quantity, group_id').eq('user_id', userId),
                supabase.from('goods_master').select('id, name'),
              ]);

              const nameMap: Record<string, string> = {};
              (goodsNamesRes.data || []).forEach((g: { id: string; name: string }) => { nameMap[g.id] = g.name; });

              // Build their have/want sets
              const theirHave: Record<string, number> = {};
              const theirWant = new Set<string>();
              for (const row of theirGoodsRes.data || []) {
                if (row.type === 'have') theirHave[row.goods_id] = row.quantity || 1;
                else theirWant.add(row.goods_id);
              }

              // Build my have/want sets
              const myHave = new Set<string>();
              const myWant = new Set<string>();
              for (const row of myGoodsRes.data || []) {
                if (row.type === 'have') myHave.add(row.goods_id);
                else myWant.add(row.goods_id);
              }

              // Cross-match: they offer items I want, they want items I have
              const theyOffer = Object.keys(theirHave)
                .filter((id) => myWant.has(id))
                .map((id) => ({ name: nameMap[id] || id, quantity: theirHave[id] }));
              const theyWant = Array.from(theirWant)
                .filter((id) => myHave.has(id))
                .map((id) => ({ name: nameMap[id] || id, quantity: 1 }));

              setIncomingRequest({
                matchRecordId: newMatch.id,
                requesterName: requesterRes.data?.nickname || '誰か',
                colorCode: newMatch.color_code,
                requesterId: newMatch.user1_id,
                theyOffer,
                theyWant,
              });
            }
          }
        )
        .subscribe();

      matchChannelRef.current = channel;
    }, 100);

    return () => {
      cancelled = true;
      clearTimeout(setup);
      if (matchChannelRef.current) {
        supabase.removeChannel(matchChannelRef.current);
        matchChannelRef.current = null;
      }
    };
  }, []);

  const handleAcceptRequest = async () => {
    if (!incomingRequest) return;

    await supabase
      .from('matches')
      .update({ status: 'accepted' })
      .eq('id', incomingRequest.matchRecordId);

    localStorage.setItem('currentMatch', JSON.stringify({
      id: incomingRequest.requesterId,
      nickname: incomingRequest.requesterName,
      distance: 0,
      groupMatches: [],
      colorCode: incomingRequest.colorCode || '#FF6B6B',
      matchRecordId: incomingRequest.matchRecordId,
      lat: 0,
      lng: 0,
    }));
    router.push('/identify');
  };

  const fetchGoods = async (eventId: string) => {
    const { data: evData } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (evData) {
      setEventName(evData.name);
      setEventData(evData as Event);
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

  const setRatio = (groupIdx: number, give: number, get: number) => {
    updateGroup(groupIdx, (g) => ({
      ...g,
      giveCount: give,
      wantQuantity: get,
    }));
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

  const now = new Date().toISOString();
  const isRegisterOpen = !eventData?.register_start && !eventData?.register_end
    ? true
    : ((!eventData?.register_start || now >= eventData.register_start) &&
       (!eventData?.register_end || now <= eventData.register_end));
  const isTradeOpen = !eventData?.trade_start && !eventData?.trade_end
    ? true
    : ((!eventData?.trade_start || now >= eventData.trade_start) &&
       (!eventData?.trade_end || now <= eventData.trade_end));

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
      <main className="min-h-screen flex items-center justify-center bg-[#1a2d4a]">
        <div className="text-slate-400 text-2xl">読み込み中...</div>
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
                : 'bg-slate-100 border-slate-300'
            }`}
          >
            {good.image_url && (
              <div className="relative w-full aspect-square mb-1 bg-slate-200 rounded-lg overflow-hidden">
                <Image
                  src={good.image_url}
                  alt={good.name}
                  fill
                  className="object-contain"
                />
              </div>
            )}
            <p className="text-xs font-medium text-slate-700 leading-tight">
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
                <span className="text-xs font-bold w-5 text-center text-slate-700">{qty}</span>
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
    <main className="min-h-screen bg-[#1a2d4a] p-4">
      <div className="max-w-4xl mx-auto">
        {/* 交換リクエスト通知 */}
        {incomingRequest && (
          <div className="bg-amber-500/10 border-2 border-amber-500/30 p-5 rounded-2xl mb-4">
            <p className="font-bold text-amber-600 text-lg mb-3 flex items-center gap-2">
              <Bell className="w-5 h-5" /> {incomingRequest.requesterName}さんから交換リクエスト！
            </p>

            {/* 交換内容 */}
            {(incomingRequest.theyOffer.length > 0 || incomingRequest.theyWant.length > 0) && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-white/60 rounded-lg p-2">
                  <p className="text-xs font-semibold text-indigo-600 mb-1">もらえるグッズ</p>
                  <ul className="text-xs text-slate-700 space-y-0.5">
                    {incomingRequest.theyOffer.map((item, i) => (
                      <li key={i}>✓ {item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white/60 rounded-lg p-2">
                  <p className="text-xs font-semibold text-indigo-600 mb-1">渡すグッズ</p>
                  <ul className="text-xs text-slate-700 space-y-0.5">
                    {incomingRequest.theyWant.map((item, i) => (
                      <li key={i}>✓ {item.name}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleAcceptRequest}
                className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white py-3 rounded-xl font-bold transition-colors"
              >
                承認して識別へ
              </button>
              <button
                onClick={() => setIncomingRequest(null)}
                className="px-4 bg-slate-100 text-slate-600 py-3 rounded-xl font-semibold hover:bg-slate-300 transition-colors"
              >
                後で
              </button>
            </div>
          </div>
        )}

        {/* ヘッダー */}
        <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 p-6 mb-4">
          <h1 className="text-xl font-bold text-slate-800 mb-2">{eventName}</h1>
          <p className="text-slate-400">交換したいグッズを登録しましょう</p>
        </div>

        {/* 交換セット一覧 */}
        {tradeGroups.map((group, idx) => {
          const isExpanded = expandedGroup === idx;
          const haveCount = Object.values(group.have).reduce((s, q) => s + q, 0);
          const wantCount = group.wantItems.length;

          return (
            <div key={idx} className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 mb-4 overflow-hidden">
              {/* グループヘッダー */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer bg-slate-100"
                onClick={() => setExpandedGroup(isExpanded ? -1 : idx)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-indigo-600">
                    交換セット {idx + 1}
                  </span>
                  <span className="text-sm font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                    {group.giveCount || 1}:{group.wantQuantity} 交換
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {tradeGroups.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeGroup(idx); }}
                      className="w-8 h-8 rounded-full bg-red-500/20 text-red-600 font-bold text-sm flex items-center justify-center hover:bg-red-500/30"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="p-4">
                  {/* 譲るグッズ */}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-indigo-600 mb-3 flex items-center gap-2">
                      【譲】
                      <span className="text-sm font-normal text-slate-400">
                        ({Object.keys(group.have).length}種類 / 合計{haveCount}個)
                      </span>
                    </h3>
                    {Object.entries(groupedGoods).map(([category, items]) => (
                      <div key={category} className="mb-4">
                        <h4 className="text-sm font-semibold text-slate-600 mb-2">
                          {category}
                        </h4>
                        {renderGoodsGrid(
                          items,
                          group.have,
                          (id) => toggleHave(idx, id),
                          (id, d) => adjustHaveQty(idx, id, d),
                          'bg-indigo-500/20', 'border-indigo-500', 'bg-indigo-500',
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 欲しいグッズ */}
                  <div>
                    <h3 className="text-lg font-bold text-indigo-600 mb-3 flex items-center gap-2">
                      【求】
                      <span className="text-sm font-normal text-slate-400">
                        ({wantCount}種類から)
                      </span>
                    </h3>
                    {Object.entries(groupedGoods).map(([category, items]) => (
                      <div key={category} className="mb-4">
                        <h4 className="text-sm font-semibold text-slate-600 mb-2">
                          {category}
                        </h4>
                        {renderGoodsGrid(
                          items,
                          makeWantMap(group.wantItems),
                          (id) => toggleWant(idx, id),
                          null,
                          'bg-indigo-500/20', 'border-indigo-400', 'bg-indigo-500',
                        )}
                      </div>
                    ))}

                    {/* 交換比率 */}
                    <div className="mt-4 bg-slate-100 border border-slate-300 rounded-xl p-3">
                      <p className="text-sm font-semibold text-slate-600 mb-2">
                        交換比率（譲る数 : 求める数）
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {RATIO_PRESETS.map(([g, w]) => {
                          const isActive = (group.giveCount || 1) === g && group.wantQuantity === w;
                          return (
                            <button
                              key={`${g}:${w}`}
                              onClick={() => setRatio(idx, g, w)}
                              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                                isActive
                                  ? 'bg-indigo-500 text-white'
                                  : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {g}:{w}
                            </button>
                          );
                        })}
                      </div>
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
          className="w-full bg-slate-50 py-3 rounded-xl font-bold text-lg border-2 border-dashed border-slate-300 text-slate-600 hover:bg-slate-200 transition-all mb-4 flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> 交換セットを追加
        </button>

        {/* グッズリクエストボタン */}
        {eventData?.allow_goods_request !== false && (
          <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 p-6 mb-4">
            <p className="text-slate-600 mb-3">
              探しているグッズが見つかりませんか？
            </p>
            <button
              onClick={() => router.push('/request-goods')}
              className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 py-3 rounded-xl font-bold transition-colors"
            >
              グッズを追加リクエスト
            </button>
          </div>
        )}

        {/* 登録期間外メッセージ */}
        {!isRegisterOpen && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-2 text-center">
            <p className="text-sm text-amber-600 font-semibold">
              現在はアイテム登録期間外です
            </p>
            {eventData?.register_start && now < eventData.register_start && (
              <p className="text-xs text-amber-700 mt-1">
                登録開始: {new Date(eventData.register_start).toLocaleString('ja-JP')}
              </p>
            )}
          </div>
        )}

        {/* 次へボタン */}
        {isTradeOpen ? (
          <button
            onClick={handleNext}
            disabled={!isValid || !isRegisterOpen}
            className="w-full bg-indigo-500 hover:bg-indigo-400 text-white py-4 rounded-xl font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            マッチング開始
          </button>
        ) : (
          <div className="w-full bg-slate-200 text-slate-400 py-4 rounded-xl font-bold text-lg text-center">
            交換可能期間外です
            {eventData?.trade_start && now < eventData.trade_start && (
              <p className="text-xs font-normal mt-1">
                開始: {new Date(eventData.trade_start).toLocaleString('ja-JP')}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 text-center">
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-slate-500 text-xs hover:text-slate-400"
            >
              データを全て削除して終了
            </button>
          ) : (
            <div className="bg-slate-50 rounded-2xl shadow-sm border border-red-500/30 p-4 text-left">
              <p className="text-sm font-bold text-red-600 mb-2">
                本当に削除しますか？
              </p>
              <p className="text-xs text-slate-400 mb-3">
                あなたの登録データ（ユーザー情報・グッズ登録・マッチング履歴）が全て削除されます。この操作は取り消せません。
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAllData}
                  disabled={deleting}
                  className="flex-1 bg-red-500/20 text-red-600 border border-red-500/30 py-2 rounded-xl text-sm font-bold hover:bg-red-500/30 disabled:opacity-50"
                >
                  {deleting ? '削除中...' : '削除する'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-xl text-sm font-semibold hover:bg-slate-300"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
